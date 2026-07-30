import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Device, DeviceInfo } from '@capacitor/device';
import { PushNotifications } from '@capacitor/push-notifications';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type PhotoSource = 'camera' | 'gallery' | 'prompt';

export interface CapturedPhoto {
  dataUrl: string;
  file: File;
  format: string;
}

/**
 * Return true from a BackHandler if it consumed the event so the default
 * navigation-back / app-exit fallback doesn't fire.
 */
export type BackHandler = () => boolean | Promise<boolean>;
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

@Injectable({
  providedIn: 'root',
})
export class CapacitorService {
  isNative = Capacitor.isNativePlatform();
  platform = signal<string>(Capacitor.getPlatform());

  private backHandlers: BackHandler[] = [];
  private shellInitialized = false;

  // ── Native shell bootstrap ─────────────────────────────────────────────────
  /**
   * One-time init called from APP_INITIALIZER. Sets the status bar style, wires
   * the Android hardware back button into a shared handler stack so open
   * modals / drawers / scanners can intercept it, and installs a
   * platform-detection class on <html> so CSS can adapt without JS checks.
   *
   * Safe to call on the web — the native APIs are all no-ops there.
   */
  async initNativeShell(): Promise<void> {
    if (this.shellInitialized) return;
    this.shellInitialized = true;

    document.documentElement.classList.add(`platform-${this.platform()}`);
    if (this.isNative) document.documentElement.classList.add('native');

    if (!this.isNative) return;

    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (err) {
      console.warn('StatusBar init failed:', err);
    }

    try {
      await CapacitorApp.addListener('backButton', async ({ canGoBack }) => {
        // Run handlers LIFO — most recently registered (topmost UI) wins.
        for (let i = this.backHandlers.length - 1; i >= 0; i--) {
          try {
            const handled = await this.backHandlers[i]();
            if (handled) return;
          } catch (err) {
            console.warn('Back handler threw:', err);
          }
        }
        if (canGoBack) {
          window.history.back();
        } else {
          await CapacitorApp.exitApp();
        }
      });
    } catch (err) {
      console.warn('Failed to register hardware back listener:', err);
    }
  }

  /**
   * Register a handler for the Android hardware back button. Returns an
   * unregister function so components can clean up in ngOnDestroy.
   *
   *   const unregister = capacitor.registerBackHandler(() => {
   *     if (this.isOpen()) { this.close(); return true; }
   *     return false;
   *   });
   */
  registerBackHandler(handler: BackHandler): () => void {
    this.backHandlers.push(handler);
    return () => {
      const idx = this.backHandlers.indexOf(handler);
      if (idx >= 0) this.backHandlers.splice(idx, 1);
    };
  }

  // ── Haptics ────────────────────────────────────────────────────────────────
  /**
   * Fire a small haptic pulse for tactile feedback on native devices. Silently
   * no-ops on the web. Kept dead simple so call sites don't need to think.
   */
  async haptic(style: HapticStyle = 'light'): Promise<void> {
    if (!this.isNative) return;
    try {
      if (style === 'success' || style === 'warning' || style === 'error') {
        const map = {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        };
        await Haptics.notification({ type: map[style] });
      } else {
        const map = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: map[style] });
      }
    } catch (err) {
      /* haptics unsupported — silently ignore */
    }
  }

  // ── Device Info ─────────────────────────────────────────────────────────────
  async getDeviceInfo(): Promise<DeviceInfo> {
    return await Device.getInfo();
  }

  async getDeviceId(): Promise<string> {
    const { identifier } = await Device.getId();
    return identifier;
  }

  // ── Camera ──────────────────────────────────────────────────────────────────
  /**
   * Capture an image and return it as a File that can be uploaded.
   * Uses native Camera on device (prompt / camera / gallery) and falls back to
   * an HTML <input type="file"> on the browser. When `source` is 'camera' on
   * web, the input requests the environment-facing camera via capture attr.
   */
  async capturePhoto(source: PhotoSource = 'prompt'): Promise<CapturedPhoto | null> {
    if (this.isNative) {
      try {
        const cameraSource =
          source === 'camera'
            ? CameraSource.Camera
            : source === 'gallery'
              ? CameraSource.Photos
              : CameraSource.Prompt;

        const image = await Camera.getPhoto({
          quality: 82,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: cameraSource,
          correctOrientation: true,
        });
        if (!image.dataUrl) return null;
        const format = image.format || 'jpeg';
        const file = this.dataUrlToFile(image.dataUrl, `photo-${Date.now()}.${format}`);
        return { dataUrl: image.dataUrl, file, format };
      } catch (error) {
        console.warn('Camera capture cancelled or failed:', error);
        return null;
      }
    }

    // Browser fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'camera') {
        // Hint to mobile browsers to open the back camera directly
        input.setAttribute('capture', 'environment');
      }
      input.onchange = (e: any) => {
        const file: File | undefined = e.target.files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve({
            dataUrl,
            file,
            format: (file.type.split('/')[1] || 'jpeg').toLowerCase(),
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  /**
   * Legacy convenience wrapper that just returns the data URL. Kept for
   * backwards compatibility with any callers that still use it.
   */
  async takePicture(): Promise<string | null> {
    const captured = await this.capturePhoto('prompt');
    return captured?.dataUrl ?? null;
  }

  /** Convert a base64 data URL into a File suitable for FormData uploads. */
  dataUrlToFile(dataUrl: string, filename: string): File {
    const [meta, base64] = dataUrl.split(',');
    const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'image/jpeg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  }

  // ── QR Code Scanning ────────────────────────────────────────────────────────
  isScanning = signal<boolean>(false);

  /**
   * Start a QR / barcode scan.
   *  - Native: uses @capacitor-community/barcode-scanner with a transparent
   *    background so the app can render a viewfinder overlay.
   *  - Web: uses the native BarcodeDetector API when available, otherwise
   *    prompts the operator to type the code (for testing).
   * Returns the decoded string, or null if cancelled / failed.
   */
  async startQRScan(): Promise<string | null> {
    if (this.isNative) {
      try {
        const status = await BarcodeScanner.checkPermission({ force: true });
        if (!status.granted) {
          console.warn('BarcodeScanner permission not granted');
          return null;
        }
        this.isScanning.set(true);
        document.body.classList.add('qr-scanner-active');
        await BarcodeScanner.hideBackground();
        const result = await BarcodeScanner.startScan();
        await this.stopQRScan();
        return result.hasContent ? result.content : null;
      } catch (error) {
        console.error('BarcodeScanner error:', error);
        await this.stopQRScan();
        return null;
      }
    }

    // Web fallback — try the browser's BarcodeDetector via getUserMedia.
    const anyWindow = window as any;
    if (anyWindow.BarcodeDetector && navigator.mediaDevices) {
      try {
        return await this.scanWithBrowserApi();
      } catch (err) {
        console.warn('Web BarcodeDetector failed, falling back to manual entry:', err);
      }
    }

    // Last-resort: prompt for manual entry (useful in dev/desktop testing).
    this.isScanning.set(true);
    const mockValue = prompt(
      'QR Scanner web fallback:\nType or paste the QR code contents to simulate a scan:',
    );
    this.isScanning.set(false);
    return mockValue?.trim() || null;
  }

  async stopQRScan(): Promise<void> {
    this.isScanning.set(false);
    if (this.isNative) {
      try {
        document.body.classList.remove('qr-scanner-active');
        await BarcodeScanner.showBackground();
        await BarcodeScanner.stopScan();
      } catch (error) {
        console.error('Failed to stop BarcodeScanner:', error);
      }
    }
  }

  /**
   * Opens a fullscreen <video> element bound to the back camera and polls the
   * browser's BarcodeDetector every ~250ms until a code is found or the user
   * closes the overlay.
   */
  private scanWithBrowserApi(): Promise<string | null> {
    return new Promise(async (resolve) => {
      this.isScanning.set(true);
      const anyWindow = window as any;
      const detector = new anyWindow.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      const overlay = document.createElement('div');
      overlay.className =
        'fixed inset-0 z-[9999] bg-slate-950/95 flex flex-col items-center justify-center p-6 gap-4';

      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      video.autoplay = true;
      video.className =
        'w-full max-w-md aspect-square object-cover rounded-2xl border border-white/20';

      const frame = document.createElement('div');
      frame.className = 'pointer-events-none absolute inset-0 flex items-center justify-center';
      frame.innerHTML =
        '<div class="w-56 h-56 border-2 border-violet-400 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]"></div>';

      const stopBtn = document.createElement('button');
      stopBtn.textContent = 'Cancel';
      stopBtn.className =
        'px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer';

      const wrapper = document.createElement('div');
      wrapper.className = 'relative';
      wrapper.appendChild(video);
      wrapper.appendChild(frame);

      const label = document.createElement('p');
      label.textContent = 'Point the camera at a QR code';
      label.className = 'text-xs text-slate-300';

      overlay.appendChild(wrapper);
      overlay.appendChild(label);
      overlay.appendChild(stopBtn);
      document.body.appendChild(overlay);
      video.srcObject = stream;

      let stopped = false;
      const cleanup = (value: string | null) => {
        if (stopped) return;
        stopped = true;
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          /* ignore */
        }
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        this.isScanning.set(false);
        resolve(value);
      };

      stopBtn.onclick = () => cleanup(null);

      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(video);
          if (codes && codes.length > 0) {
            cleanup(codes[0].rawValue ?? codes[0].displayValue ?? null);
            return;
          }
        } catch {
          /* detector may throw before the video has a frame — ignore */
        }
        setTimeout(tick, 250);
      };
      video.onloadedmetadata = () => tick();
    });
  }

  // ── Push Notifications ──────────────────────────────────────────────────────
  async registerPushNotifications(
    onTokenReceived: (token: string) => void,
    onNotification: (notification: any) => void,
  ): Promise<boolean> {
    if (!this.isNative) {
      console.log('Push notifications are only available on native platforms');
      return false;
    }

    try {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted') {
        permission = await PushNotifications.requestPermissions();
      }

      if (permission.receive === 'granted') {
        // Register with Apple / Google
        await PushNotifications.register();

        // Listen for device token
        await PushNotifications.addListener('registration', (token) => {
          onTokenReceived(token.value);
        });

        // Listen for registration error
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('Push notification registration error:', err);
        });

        // Listen for incoming notifications
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          onNotification(notification);
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting up Push Notifications:', error);
      return false;
    }
  }
}

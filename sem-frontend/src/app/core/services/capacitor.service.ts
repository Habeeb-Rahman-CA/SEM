import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Device, DeviceInfo } from '@capacitor/device';
import { PushNotifications } from '@capacitor/push-notifications';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

@Injectable({
  providedIn: 'root',
})
export class CapacitorService {
  isNative = Capacitor.isNativePlatform();
  platform = signal<string>(Capacitor.getPlatform());

  // ── Device Info ─────────────────────────────────────────────────────────────
  async getDeviceInfo(): Promise<DeviceInfo> {
    return await Device.getInfo();
  }

  async getDeviceId(): Promise<string> {
    const { identifier } = await Device.getId();
    return identifier;
  }

  // ── Camera ──────────────────────────────────────────────────────────────────
  async takePicture(): Promise<string | null> {
    if (this.isNative) {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
        });
        return image.dataUrl || null;
      } catch (error) {
        console.error('Camera error:', error);
        return null;
      }
    } else {
      // Browser fallback using dynamic input element
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    }
  }

  // ── QR Code Scanning ────────────────────────────────────────────────────────
  isScanning = signal<boolean>(false);

  async startQRScan(): Promise<string | null> {
    if (this.isNative) {
      try {
        const status = await BarcodeScanner.checkPermission({ force: true });
        if (!status.granted) {
          console.warn('BarcodeScanner permission not granted');
          return null;
        }
        this.isScanning.set(true);
        // Add style to body to make background transparent
        document.body.classList.add('qr-scanner-active');
        await BarcodeScanner.hideBackground();
        const result = await BarcodeScanner.startScan();
        this.stopQRScan();
        if (result.hasContent) {
          return result.content;
        }
        return null;
      } catch (error) {
        console.error('BarcodeScanner error:', error);
        this.stopQRScan();
        return null;
      }
    } else {
      // Browser simulation fallback: prompt for QR text
      this.isScanning.set(true);
      return new Promise((resolve) => {
        const mockValue = prompt(
          'QR Scanner Web Fallback:\nEnter ticket/QR code value to simulate scanning:',
        );
        this.isScanning.set(false);
        resolve(mockValue || null);
      });
    }
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

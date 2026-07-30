import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';

/**
 * PCI-scope guard. Rejects any request whose body contains raw card
 * data at any nesting depth.
 *
 * The platform never sees a pan/cvv/expiry: the tokenised payment method
 * comes from the gateway's client SDK (Stripe.js / Elements) and only a
 * server-side reference lands on our endpoints. This guard exists as a
 * defensive check so an accidental client change or a curl'd test can't
 * silently push us into PCI scope.
 *
 * On a hit we log the field name (never the value) and return 400 with a
 * generic message so this doesn't leak which field matched.
 */
@Injectable()
export class NoCardDataGuard implements CanActivate {
  private readonly logger = new Logger(NoCardDataGuard.name);

  /**
   * Banned keys (case-insensitive, punctuation-insensitive). If a payload
   * carries any of these — at any depth — the request is refused.
   */
  private static readonly BANNED_KEYS = [
    'pan',
    'cardnumber',
    'ccnumber',
    'creditcardnumber',
    'cvv',
    'cvc',
    'cvv2',
    'cvc2',
    'cardcvc',
    'cardcvv',
    'securitycode',
    'expmonth',
    'expyear',
    'expirationmonth',
    'expirationyear',
    'expdate',
    'expirationdate',
    'expiry',
    'cardholder',
    'cardholdername',
    'nameoncard',
    'track1',
    'track2',
    'magstripe',
  ];

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const body = req?.body;
    if (!body || typeof body !== 'object') return true;

    const hit = this.findBannedKey(body, 0);
    if (hit) {
      this.logger.warn(
        `Rejected payment request carrying banned field "${hit}" (route: ${req?.method} ${req?.url}). Card data must be tokenised client-side; the server never accepts raw pan/cvv/expiry.`,
      );
      throw new BadRequestException(
        'This endpoint does not accept card data. Tokenise the payment method with the gateway SDK (Stripe.js / Elements) and submit only the resulting token.',
      );
    }
    return true;
  }

  private findBannedKey(value: unknown, depth: number): string | null {
    // Cap recursion depth to avoid pathological payloads.
    if (depth > 8 || value === null || value === undefined) return null;
    if (Array.isArray(value)) {
      for (const item of value) {
        const hit = this.findBannedKey(item, depth + 1);
        if (hit) return hit;
      }
      return null;
    }
    if (typeof value !== 'object') return null;
    for (const key of Object.keys(value)) {
      const normalised = key.toLowerCase().replace(/[_\-\s]/g, '');
      if (NoCardDataGuard.BANNED_KEYS.includes(normalised)) {
        return key;
      }
      const child = (value as Record<string, unknown>)[key];
      const hit = this.findBannedKey(child, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
}

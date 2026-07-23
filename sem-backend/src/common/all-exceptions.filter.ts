import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { ErrorLoggerService } from '../reliability/logging/error-logger.service';
import { ErrorSeverity } from '../reliability/logging/error-log.entity';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    @Optional() private readonly errorLogger?: ErrorLoggerService,
  ) {}

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = exception instanceof Error ? exception.message : String(exception);
    let errorDetails: any = null;

    if (exceptionResponse) {
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorDetails = (exceptionResponse as any).error || null;
      } else {
        message = String(exceptionResponse);
      }
    }

    // Route to structured logger
    this.captureError(request, statusCode, message, exception).catch((err) => {
      console.error('Failed to log error:', err);
    });

    // Send standardized error response
    response.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message : [message],
      error: errorDetails || (statusCode >= 500 ? 'Internal Server Error' : 'Bad Request'),
    });
  }

  private async captureError(
    request: any,
    statusCode: number,
    message: string,
    exception: any,
  ): Promise<void> {
    if (statusCode < 400) return;

    const user = request.user;
    const userId = user?.id ?? null;
    const username = user?.username ?? null;
    const { method, path: reqPath } = request;
    const ipAddress = request.ip || request.headers['x-forwarded-for'] || null;
    const userAgent = request.headers?.['user-agent'] || null;

    const cleanMessage = Array.isArray(message) ? message.join(', ') : message;
    const error = exception instanceof Error ? exception : null;

    const severity =
      statusCode >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN;

    if (this.errorLogger) {
      await this.errorLogger.logError(cleanMessage, error, {
        severity,
        context: 'HttpException',
        requestMethod: method,
        requestPath: reqPath,
        statusCode,
        userId,
        username,
        ipAddress,
        userAgent,
      });
    } else {
      // Fallback to NestJS Logger when DI not available (e.g., bootstrap phase)
      if (statusCode >= 500) {
        this.logger.error(
          `[${method} ${reqPath}] ${cleanMessage} (User: ${username ?? userId ?? 'Guest'}, IP: ${ipAddress})`,
          error?.stack,
        );
      } else {
        this.logger.warn(`[${method} ${reqPath}] Status ${statusCode}: ${cleanMessage}`);
      }
    }
  }

  private redactPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    if (Array.isArray(payload)) return payload.map((item) => this.redactPayload(item));
    const redacted = { ...payload };
    const sensitiveKeys = ['password', 'token', 'secret', 'passwordConfirm', 'accessToken', 'refreshToken', 'avatarUrl'];
    for (const key in redacted) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactPayload(redacted[key]);
      }
    }
    return redacted;
  }
}

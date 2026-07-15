import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { LogsService } from '../logs/logs.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logsService: LogsService) {}

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

    // Capture error in database
    this.logErrorToDb(request, statusCode, message, exception).catch((err) => {
      console.error('Failed to log error to database:', err);
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

  private async logErrorToDb(
    request: any,
    statusCode: number,
    message: string,
    exception: any,
  ): Promise<void> {
    // Only log client-side errors (>= 400) and server-side errors
    if (statusCode < 400) return;

    const user = request.user;
    const userId = user?.id || null;
    const username = user?.username || null;
    const { method, path, body, headers } = request;
    const ipAddress = request.ip || headers['x-forwarded-for'] || null;
    const userAgent = headers['user-agent'] || null;

    const redactedPayload = this.redactPayload(body);
    const stack = statusCode >= 500 && exception instanceof Error ? exception.stack || null : null;

    // Convert message list to string if it is an array
    const cleanMessage = Array.isArray(message) ? message.join(', ') : message;

    await this.logsService.createErrorLog({
      userId,
      username,
      method,
      path,
      statusCode,
      message: cleanMessage,
      stack,
      payload: redactedPayload,
      ipAddress,
      userAgent,
    });
  }

  private redactPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    if (Array.isArray(payload)) {
      return payload.map(item => this.redactPayload(item));
    }
    const redacted = { ...payload };
    const sensitiveKeys = ['password', 'token', 'secret', 'passwordConfirm', 'accessToken', 'refreshToken', 'avatarUrl'];
    for (const key in redacted) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactPayload(redacted[key]);
      }
    }
    return redacted;
  }
}

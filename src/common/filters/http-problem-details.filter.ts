import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { LocalizationService } from '../localization/localization.service';

@Catch()
export class HttpProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly localizationService: LocalizationService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    const detail = this.resolveDetail(exception, exceptionResponse, status, request);

    response.status(status).json({
      type: `https://httpstatuses.com/${status}`,
      title: HttpStatus[status] ?? 'Error',
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString()
    });
  }

  private resolveDetail(
    exception: unknown,
    exceptionResponse: string | object,
    status: number,
    request: Request
  ) {
    const language = this.resolveLanguage(request);

    if (exception instanceof MongoServerError) {
      if (exception.code === 11000) {
        return this.localizationService.translate('errors.duplicate', language);
      }
      if (exception.code === 121) {
        return this.localizationService.translate('errors.invalidData', language);
      }
    }

    if (
      exception instanceof MongooseError.CastError ||
      exception instanceof MongooseError.ValidationError ||
      exception instanceof MongooseError.StrictModeError
    ) {
      return this.localizationService.translate('errors.invalidData', language);
    }

    if (exception instanceof MongooseError.DocumentNotFoundError) {
      return this.localizationService.translate('errors.notFound', language);
    }

    if (exception instanceof MongooseError.VersionError) {
      return this.localizationService.translate('errors.conflict', language);
    }

    if (exception instanceof HttpException) {
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>).message;

      if (Array.isArray(message)) {
        return this.localizationService.translate('errors.invalidData', language);
      }

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return this.localizationService.translate('errors.rateLimit', language);
      }

      if (typeof message === 'string') {
        const normalized = message.toLowerCase();
        if (normalized === 'not found') {
          return this.localizationService.translate('errors.notFound', language);
        }
        if (normalized === 'unauthorized') {
          return this.localizationService.translate('errors.unauthorized', language);
        }
        if (normalized === 'forbidden' || normalized === 'forbidden resource') {
          return this.localizationService.translate('errors.forbidden', language);
        }
        if (normalized === 'conflict') {
          return this.localizationService.translate('errors.conflict', language);
        }
        if (normalized === 'unprocessable entity') {
          return this.localizationService.translate('errors.unprocessable', language);
        }
        if (normalized === 'bad request') {
          return this.localizationService.translate('errors.invalidData', language);
        }
        return message;
      }

      const statusCopy = this.mapStatusToCopy(status, language);
      if (statusCopy) {
        return statusCopy;
      }
    }

    if (status >= 500) {
      return this.localizationService.translate('errors.internal', language);
    }

    return this.localizationService.translate('errors.invalidData', language);
  }

  private mapStatusToCopy(status: number, language: string) {
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return this.localizationService.translate('errors.rateLimit', language);
    }
    if (status === HttpStatus.UNAUTHORIZED) {
      return this.localizationService.translate('errors.unauthorized', language);
    }
    if (status === HttpStatus.FORBIDDEN) {
      return this.localizationService.translate('errors.forbidden', language);
    }
    if (status === HttpStatus.NOT_FOUND) {
      return this.localizationService.translate('errors.notFound', language);
    }
    if (status === HttpStatus.CONFLICT) {
      return this.localizationService.translate('errors.conflict', language);
    }
    if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
      return this.localizationService.translate('errors.unprocessable', language);
    }
    if (status === HttpStatus.BAD_REQUEST) {
      return this.localizationService.translate('errors.invalidData', language);
    }
    return undefined;
  }

  private resolveLanguage(request: Request) {
    const raw =
      (request.headers['x-language'] as string | undefined) ??
      (request.headers['accept-language'] as string | undefined);
    const normalized = raw?.split(',')[0]?.trim()?.split('-')[0];
    return this.localizationService.normalizeLanguage(normalized);
  }
}

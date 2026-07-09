import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { LocalizationService } from '../localization/localization.service';
import { HttpProblemDetailsFilter } from './http-problem-details.filter';

const buildHost = (headers: Record<string, string> = {}) => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url: '/api/test', headers };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request
    })
  };
  return { host, json, status };
};

describe('HttpProblemDetailsFilter', () => {
  const localizationService = new LocalizationService();
  const filter = new HttpProblemDetailsFilter(localizationService);

  it('localizes duplicate key errors (FR by default)', () => {
    const error = new MongoServerError({ code: 11000, message: 'dup' } as never);
    const { host, json } = buildHost();

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Cette ressource existe déjà.'
      })
    );
  });

  it('localizes cast errors using Accept-Language', () => {
    const error = new MongooseError.CastError('ObjectId', 'bad', '_id');
    const { host, json } = buildHost({ 'accept-language': 'en' });

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Invalid data. Please check your input.'
      })
    );
  });

  it('maps array validation messages to generic validation copy', () => {
    const error = new BadRequestException(['field is required']);
    const { host, json } = buildHost();

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Données invalides. Vérifiez votre saisie.'
      })
    );
  });

  it('localizes mongoose validation errors', () => {
    const error = new MongooseError.ValidationError();
    const { host, json } = buildHost({ 'accept-language': 'en' });

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Invalid data. Please check your input.'
      })
    );
  });

  it('localizes not found errors with default message', () => {
    const error = new NotFoundException();
    const { host, json } = buildHost({ 'accept-language': 'fr' });

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Ressource introuvable.'
      })
    );
  });

  it('localizes unauthorized errors', () => {
    const error = new UnauthorizedException();
    const { host, json } = buildHost();

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Accès non autorisé.'
      })
    );
  });

  it('localizes conflict errors', () => {
    const error = new HttpException('Conflict', HttpStatus.CONFLICT);
    const { host, json } = buildHost({ 'accept-language': 'en' });

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Conflict detected. Please try again.'
      })
    );
  });

  it('preserves explicit http exception messages', () => {
    const error = new BadRequestException('Email already registered');
    const { host, json } = buildHost();

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Email already registered'
      })
    );
  });

  it('localizes rate limit responses', () => {
    const error = new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    const { host, json } = buildHost({ 'x-language': 'fr' });

    filter.catch(error, host as never);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Trop de requêtes. Veuillez réessayer plus tard.'
      })
    );
  });
});

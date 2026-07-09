import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface IntegrationStatus {
  name: 'smtp' | 'googleMaps';
  configured: boolean;
  ok: boolean;
  status: 'OK' | 'ERROR' | 'UNCONFIGURED';
  details: string;
  checkedAt: string;
}

@Injectable()
export class IntegrationValidationService {
  constructor(private readonly configService: ConfigService) {}

  getStatus() {
    const smtpConfigured = this.isSmtpConfigured();
    const googleMapsConfigured = this.isGoogleMapsConfigured();

    return {
      smtp: this.createStatus(
        'smtp',
        smtpConfigured,
        smtpConfigured,
        smtpConfigured ? 'SMTP configuration detected' : 'SMTP is not configured'
      ),
      googleMaps: this.createStatus(
        'googleMaps',
        googleMapsConfigured,
        googleMapsConfigured,
        googleMapsConfigured ? 'Google Maps API key configured' : 'Google Maps API key not configured'
      )
    };
  }

  async validateConnections() {
    const smtp = await this.validateSmtpConnection();
    const googleMaps = await this.validateGoogleMapsConnection();

    return { smtp, googleMaps };
  }

  private async validateSmtpConnection(): Promise<IntegrationStatus> {
    if (!this.isSmtpConfigured()) {
      return this.createStatus('smtp', false, false, 'SMTP is not configured');
    }

    const host = this.configService.get<string>('smtp.host');
    const port = this.configService.get<number>('smtp.port');
    const user = this.configService.get<string>('smtp.user');
    const pass = this.configService.get<string>('smtp.pass');

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      await transporter.verify();

      return this.createStatus('smtp', true, true, 'SMTP connection verified');
    } catch (error) {
      return this.createStatus(
        'smtp',
        true,
        false,
        `SMTP verification failed: ${(error as Error).message}`
      );
    }
  }

  private isSmtpConfigured() {
    return Boolean(
      this.configService.get<string>('smtp.host') &&
        this.configService.get<string>('smtp.user') &&
        this.configService.get<string>('smtp.pass')
    );
  }

  private isGoogleMapsConfigured() {
    return Boolean(this.configService.get<string>('googleMaps.apiKey'));
  }

  private async validateGoogleMapsConnection(): Promise<IntegrationStatus> {
    const apiKey = this.configService.get<string>('googleMaps.apiKey');

    if (!apiKey) {
      return this.createStatus('googleMaps', false, false, 'Google Maps API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${apiKey}`
      );
      const data = (await response.json()) as { status: string; error_message?: string };

      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        return this.createStatus('googleMaps', true, true, 'Google Maps API connection verified');
      }

      return this.createStatus(
        'googleMaps',
        true,
        false,
        `Google Maps API error: ${data.error_message ?? data.status}`
      );
    } catch (error) {
      return this.createStatus(
        'googleMaps',
        true,
        false,
        `Google Maps API request failed: ${(error as Error).message}`
      );
    }
  }

  private createStatus(
    name: 'smtp' | 'googleMaps',
    configured: boolean,
    ok: boolean,
    details: string
  ): IntegrationStatus {
    return {
      name,
      configured,
      ok,
      status: configured ? (ok ? 'OK' : 'ERROR') : 'UNCONFIGURED',
      details,
      checkedAt: new Date().toISOString()
    };
  }
}

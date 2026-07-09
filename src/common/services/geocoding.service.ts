import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeocodingResult {
  lat: number;
  lng: number;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

@Injectable()
export class GeocodingService {
  constructor(private readonly configService: ConfigService) {}

  async geocodeAddress(address?: string): Promise<GeocodingResult | null> {
    const apiKey = this.configService.get<string>('googleMaps.apiKey');
    const normalizedAddress = address?.trim();

    if (!apiKey || !normalizedAddress) {
      return null;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', normalizedAddress);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        status?: string;
        results?: Array<{
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };

      const first = data.results?.[0];
      const location = first?.geometry?.location;

      if (data.status !== 'OK' || location?.lat === undefined || location?.lng === undefined) {
        return null;
      }

      return {
        lat: location.lat,
        lng: location.lng,
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: first?.formatted_address
      };
    } catch {
      return null;
    }
  }
}

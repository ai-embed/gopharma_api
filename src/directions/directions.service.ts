import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeocodingService } from 'src/common/services/geocoding.service';
import { DirectionsQueryDto, TravelMode } from './dto/directions-query.dto';
import { DirectionsResponseDto } from './dto/directions-response.dto';

interface DirectionsPoint {
  lat: number;
  lng: number;
  address?: string;
}

interface DirectionsMetric {
  text: string;
  value: number;
}

@Injectable()
export class DirectionsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly geocodingService: GeocodingService
  ) {}

  async getDirections(dto: DirectionsQueryDto): Promise<DirectionsResponseDto> {
    const apiKey = this.configService.get<string>('googleMaps.apiKey');
    if (!apiKey) {
      throw new BadRequestException('Google Maps not configured');
    }

    const origin = await this.resolvePoint({
      address: dto.originAddress,
      lat: dto.originLat,
      lng: dto.originLng
    });
    const destination = await this.resolvePoint({
      address: dto.destinationAddress,
      lat: dto.destinationLat,
      lng: dto.destinationLng
    });

    if (!origin || !destination) {
      throw new BadRequestException('Origin and destination are required');
    }

    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    url.searchParams.set('mode', dto.mode ?? TravelMode.DRIVING);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new BadRequestException('Directions service unavailable');
    }

    const data = (await response.json()) as {
      status?: string;
      routes?: Array<{
        overview_polyline?: { points?: string };
        legs?: Array<{
          distance?: DirectionsMetric;
          duration?: DirectionsMetric;
          start_address?: string;
          end_address?: string;
        }>;
      }>;
    };

    const route = data.routes?.[0];
    const leg = route?.legs?.[0];

    if (data.status !== 'OK' || !leg?.distance || !leg?.duration) {
      throw new BadRequestException('No route found');
    }

    return {
      origin: {
        ...origin,
        address: leg.start_address ?? origin.address
      },
      destination: {
        ...destination,
        address: leg.end_address ?? destination.address
      },
      distance: leg.distance,
      duration: leg.duration,
      polyline: route?.overview_polyline?.points
    };
  }

  private async resolvePoint(input: {
    address?: string;
    lat?: number;
    lng?: number;
  }): Promise<DirectionsPoint | null> {
    if (input.lat !== undefined && input.lng !== undefined) {
      return { lat: input.lat, lng: input.lng, address: input.address };
    }

    if (!input.address) {
      return null;
    }

    const result = await this.geocodingService.geocodeAddress(input.address);
    if (!result) {
      return null;
    }

    return {
      lat: result.lat,
      lng: result.lng,
      address: result.formattedAddress ?? input.address
    };
  }
}

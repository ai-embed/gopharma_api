import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DirectionsPointDto {
  @ApiProperty({ example: 6.3654 })
  lat!: number;

  @ApiProperty({ example: 2.4183 })
  lng!: number;

  @ApiPropertyOptional({ example: 'Cotonou, Benin' })
  address?: string;
}

class DirectionsMetricDto {
  @ApiProperty({ example: '5.2 km' })
  text!: string;

  @ApiProperty({ example: 5200 })
  value!: number;
}

export class DirectionsResponseDto {
  @ApiProperty({ type: DirectionsPointDto })
  origin!: DirectionsPointDto;

  @ApiProperty({ type: DirectionsPointDto })
  destination!: DirectionsPointDto;

  @ApiProperty({ type: DirectionsMetricDto })
  distance!: DirectionsMetricDto;

  @ApiProperty({ type: DirectionsMetricDto })
  duration!: DirectionsMetricDto;

  @ApiPropertyOptional({ example: 'a~l~Fjk~uOwHJy@P' })
  polyline?: string;
}

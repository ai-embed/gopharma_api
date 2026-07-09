import { ApiProperty } from '@nestjs/swagger';
import { PublicPharmacyResponseDto } from 'src/pharmacies/dto/public-pharmacy-response.dto';

export class SearchMultiProductPharmacyResponseDto {
  @ApiProperty({ type: PublicPharmacyResponseDto })
  pharmacy!: PublicPharmacyResponseDto;

  @ApiProperty({ example: 2 })
  matchedCount!: number;

  @ApiProperty({ type: [String], example: ['Paracetamol 500mg', 'Ibuprofen 200mg'] })
  matchedProducts!: string[];
}

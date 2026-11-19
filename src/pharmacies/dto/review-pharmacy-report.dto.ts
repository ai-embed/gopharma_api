import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewPharmacyReportDto {
  @IsIn(['VERIFIED', 'REJECTED'])
  status!: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

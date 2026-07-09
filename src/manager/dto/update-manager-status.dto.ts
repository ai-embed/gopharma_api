import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateManagerStatusDto {
  @ApiProperty({ enum: ['OUVERT', 'FERME'] })
  @IsIn(['OUVERT', 'FERME'])
  status!: 'OUVERT' | 'FERME';
}

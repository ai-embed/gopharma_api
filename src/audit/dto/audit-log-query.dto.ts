import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'POST' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ enum: ['SUCCESS', 'ERROR'] })
  @IsOptional()
  @IsIn(['SUCCESS', 'ERROR'])
  outcome?: 'SUCCESS' | 'ERROR';

  @ApiPropertyOptional({ example: '65f0d2d7c9a1b33d7d9b1234' })
  @IsOptional()
  @IsString()
  actorUserId?: string;
}

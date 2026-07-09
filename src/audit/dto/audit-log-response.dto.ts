import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from 'src/common/enums/domain.enums';

export class AuditLogMetadataDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  params?: Record<string, string | number | boolean>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  query?: Record<string, string | number | boolean | string[]>;
}

export class AuditLogResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiPropertyOptional()
  actorUserId?: string;

  @ApiPropertyOptional({ enum: Role })
  actorRole?: Role;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty({ enum: ['SUCCESS', 'ERROR'] })
  outcome!: 'SUCCESS' | 'ERROR';

  @ApiProperty()
  statusCode!: number;

  @ApiPropertyOptional()
  ip?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  requestId?: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional({ type: AuditLogMetadataDto })
  metadata?: AuditLogMetadataDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items!: AuditLogResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

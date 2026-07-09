import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AutocompleteQueryDto {
  private static parseBoolean(value: unknown) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return value;
  }

  @ApiProperty({ example: 'para' })
  @IsString()
  q!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @Transform(({ value }) => AutocompleteQueryDto.parseBoolean(value))
  @IsBoolean()
  prefix?: boolean | string = false;
}

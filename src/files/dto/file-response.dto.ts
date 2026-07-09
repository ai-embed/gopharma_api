import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty()
  fileId!: string;

  @ApiProperty()
  filename!: string;
}

export class FileUploadRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary'
  })
  file!: unknown;
}

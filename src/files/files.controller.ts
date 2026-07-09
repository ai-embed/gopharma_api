import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public } from 'src/common/decorators/public.decorator';
import { FileUploadRequestDto, FileUploadResponseDto } from './dto/file-response.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Public()
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadRequestDto })
  @ApiOkResponse({ type: FileUploadResponseDto })
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.filesService.uploadFile(file, {
      uploadedAt: new Date().toISOString()
    });
  }

  @Public()
  @Get(':id')
  async download(@Param('id') id: string, @Res() res: Response) {
    const fileInfo = await this.filesService.getFileInfo(id);

    res.setHeader('Content-Type', fileInfo.contentType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileInfo.filename}"`);

    const download = this.filesService.openDownloadStream(id);
    download.pipe(res);
  }
}

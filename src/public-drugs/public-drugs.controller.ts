import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PublicDrugResponseDto } from './dto/public-drug-response.dto';
import { PublicDrugsQueryDto } from './dto/public-drugs-query.dto';
import { PublicDrugsService } from './public-drugs.service';

@ApiTags('Public Drugs')
@Controller('public-drugs')
export class PublicDrugsController {
  constructor(private readonly publicDrugsService: PublicDrugsService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: PublicDrugResponseDto, isArray: true })
  async list(@Query() query: PublicDrugsQueryDto) {
    const result = await this.publicDrugsService.search({
      q: query.q,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0
    });

    return result.items;
  }
}

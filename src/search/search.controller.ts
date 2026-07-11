import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PublicPharmacyResponseDto } from '../pharmacies/dto/public-pharmacy-response.dto';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';
import { SearchCategoriesDto } from './dto/search-categories.dto';
import { SearchMultiProductsDto } from './dto/search-multi-products.dto';
import { SearchMultiProductPharmacyResponseDto } from './dto/search-multi-response.dto';
import { SearchPharmaciesDto } from './dto/search-pharmacies.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { SearchProductResultResponseDto } from './dto/search-response.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('products')
  @ApiOkResponse({ type: SearchProductResultResponseDto, isArray: true })
  searchProducts(@Query() query: SearchProductsDto) {
    return this.searchService.searchProducts(query);
  }

  @Public()
  @Get('products/multi')
  @ApiOkResponse({ type: SearchMultiProductPharmacyResponseDto, isArray: true })
  searchProductsMulti(@Query() query: SearchMultiProductsDto) {
    return this.searchService.searchProductsMulti(query);
  }

  @Public()
  @Get('pharmacies')
  @ApiOkResponse({ type: PublicPharmacyResponseDto, isArray: true })
  searchPharmacies(@Query() query: SearchPharmaciesDto) {
    return this.searchService.searchPharmacies(query);
  }

  @Public()
  @Get('categories')
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'string' } } })
  listCategories(@Query() query: SearchCategoriesDto) {
    return this.searchService.listCategories(query);
  }

  @Public()
  @Get('autocomplete')
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'string' } } })
  autocomplete(@Query() query: AutocompleteQueryDto) {
    return this.searchService.autocomplete(query.q, query.prefix);
  }
}

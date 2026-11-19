import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CatalogService } from '../catalog/catalog.service';
import { CreateProductDto } from '../catalog/dto/create-product.dto';
import { UpdatePriceDto } from '../catalog/dto/update-price.dto';
import { UpdateProductDto } from '../catalog/dto/update-product.dto';
import { UpdateStockDto } from '../catalog/dto/update-stock.dto';
import { SuccessResponseDto } from '../auth/dto/auth-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/domain.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import {
  ManagerInventoryItemResponseDto,
  ManagerProductMutationResponseDto,
  PriceUpdateResponseDto,
  StockMovementResponseDto,
  StockUpdateResponseDto
} from './dto/manager-response.dto';
import {
  CreateManagerCategoryDto,
  DeleteManagerCategoryDto,
  UpdateManagerCategoryDto
} from './dto/manager-category.dto';
import { ManagerCategoryResponseDto } from './dto/manager-category-response.dto';

@ApiTags('Manager')
@ApiBearerAuth('bearer')
@Roles(Role.PHARMACY_MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('manager/products')
export class ManagerProductsController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOkResponse({ type: ManagerInventoryItemResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.listManagerProducts(user.userId);
  }

  @Get('movements')
  @ApiOkResponse({ type: StockMovementResponseDto, isArray: true })
  listMovements(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.listMovements(user.userId);
  }

  @Get('categories')
  @ApiOkResponse({ type: ManagerCategoryResponseDto, isArray: true })
  listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.listManagerCategories(user.userId);
  }

  @Post('categories')
  @ApiCreatedResponse({ type: ManagerCategoryResponseDto })
  createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateManagerCategoryDto
  ) {
    return this.catalogService.createManagerCategory(user.userId, dto.name);
  }

  @Patch('categories/:id')
  @ApiOkResponse({ type: ManagerCategoryResponseDto })
  updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateManagerCategoryDto
  ) {
    return this.catalogService.updateManagerCategory(user.userId, id, dto.name);
  }

  @Delete('categories/:id')
  @ApiOkResponse({ type: SuccessResponseDto })
  deleteCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DeleteManagerCategoryDto
  ) {
    return this.catalogService.deleteManagerCategory(user.userId, id, dto.replaceWith);
  }

  @Post()
  @ApiCreatedResponse({ type: ManagerProductMutationResponseDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.catalogService.createManagerProduct(user.userId, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ManagerProductMutationResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.catalogService.updateManagerProduct(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: SuccessResponseDto })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.catalogService.deleteManagerProduct(user.userId, id);
  }

  @Patch(':id/stock')
  @ApiOkResponse({ type: StockUpdateResponseDto })
  updateStock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto
  ) {
    return this.catalogService.updateManagerStock(user.userId, id, dto);
  }

  @Patch(':id/price')
  @ApiOkResponse({ type: PriceUpdateResponseDto })
  updatePrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePriceDto
  ) {
    return this.catalogService.updateManagerPrice(user.userId, id, dto);
  }
}

import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SuccessResponseDto } from '../auth/dto/auth-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { FavoriteResponseDto } from './dto/favorite-response.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOkResponse({ type: FavoriteResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.list(user.userId);
  }

  @Post()
  @ApiCreatedResponse({ type: FavoriteResponseDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFavoriteDto) {
    return this.favoritesService.create(user.userId, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: SuccessResponseDto })
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.favoritesService.delete(user.userId, id);
  }
}

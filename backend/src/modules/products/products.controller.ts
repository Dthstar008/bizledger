import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { RedactCostsInterceptor } from '../../common/redact-costs.interceptor';
import { CurrentBusinessId } from '../../common/current-business.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(RedactCostsInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(businessId, dto);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string) {
    return this.productsService.findAll(businessId);
  }

  @Get('low-stock')
  lowStock(@CurrentBusinessId() businessId: string) {
    return this.productsService.lowStock(businessId);
  }

  @Get('barcode/:code')
  findByBarcode(@CurrentBusinessId() businessId: string, @Param('code') code: string) {
    return this.productsService.findByBarcode(businessId, code);
  }

  @Get(':id')
  findOne(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.productsService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(@CurrentBusinessId() businessId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(businessId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  remove(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.productsService.remove(businessId, id);
  }
}

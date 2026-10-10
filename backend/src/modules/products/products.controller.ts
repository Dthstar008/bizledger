import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { RedactCostsInterceptor } from '../../common/redact-costs.interceptor';
import { Actor, CurrentActor, CurrentBusinessId } from '../../common/current-business.decorator';
import { MAX_IMAGE_BYTES, ProductsService, UploadedImage } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(RedactCostsInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@CurrentBusinessId() businessId: string, @CurrentActor() actor: Actor, @Body() dto: CreateProductDto) {
    return this.productsService.create(businessId, dto, actor);
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
  findOne(@CurrentBusinessId() businessId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(
    @CurrentBusinessId() businessId: string,
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(businessId, id, dto, actor);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @HttpCode(204)
  remove(@CurrentBusinessId() businessId: string, @CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(businessId, id, actor);
  }

  @Put(':id/image')
  @Roles(Role.OWNER)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  setImage(
    @CurrentBusinessId() businessId: string,
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    return this.productsService.setImage(businessId, id, file, actor);
  }

  @Get(':id/image')
  async getImage(
    @CurrentBusinessId() businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const image = await this.productsService.getImage(businessId, id);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return new StreamableFile(image.data, { type: image.mimeType, length: image.data.length });
  }

  @Delete(':id/image')
  @Roles(Role.OWNER)
  removeImage(@CurrentBusinessId() businessId: string, @CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.removeImage(businessId, id, actor);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentBusinessId } from '../../common/current-business.decorator';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateSaleDto) {
    return this.salesService.create(businessId, dto);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string) {
    return this.salesService.findAll(businessId);
  }

  @Get(':id')
  findOne(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.salesService.findOne(businessId, id);
  }
}

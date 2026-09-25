import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RedactCostsInterceptor } from '../../common/redact-costs.interceptor';
import { CurrentBusinessId } from '../../common/current-business.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard)
@UseInterceptors(RedactCostsInterceptor)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(businessId, dto);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string) {
    return this.customersService.findAll(businessId);
  }

  @Get(':id')
  findOne(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.customersService.findOne(businessId, id);
  }

  @Post(':id/repayments')
  addRepayment(
    @CurrentBusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: CreateRepaymentDto,
  ) {
    return this.customersService.addRepayment(businessId, id, dto);
  }
}

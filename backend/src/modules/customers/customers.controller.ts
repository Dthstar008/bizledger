import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { RedactCostsInterceptor } from '../../common/redact-costs.interceptor';
import { Actor, CurrentActor, CurrentBusinessId } from '../../common/current-business.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(RedactCostsInterceptor)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@CurrentBusinessId() businessId: string, @CurrentActor() actor: Actor, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(businessId, dto, actor);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string) {
    return this.customersService.findAll(businessId);
  }

  @Get(':id')
  findOne(@CurrentBusinessId() businessId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(businessId, id);
  }

  /** Staff can already add customers, so they can correct their details too. */
  @Patch(':id')
  update(
    @CurrentBusinessId() businessId: string,
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(businessId, id, dto, actor);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @HttpCode(204)
  remove(@CurrentBusinessId() businessId: string, @CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(businessId, id, actor);
  }

  @Post(':id/repayments')
  addRepayment(
    @CurrentBusinessId() businessId: string,
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRepaymentDto,
  ) {
    return this.customersService.addRepayment(businessId, id, dto, actor);
  }
}

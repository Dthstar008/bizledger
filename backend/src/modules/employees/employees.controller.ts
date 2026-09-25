import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { CurrentBusinessId, CurrentUserId } from '../../common/current-business.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@CurrentBusinessId() businessId: string) {
    return this.employeesService.findAll(businessId);
  }

  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(businessId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentBusinessId() businessId: string,
    @CurrentUserId() actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.remove(businessId, actorId, id);
  }
}

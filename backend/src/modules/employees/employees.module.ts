import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch, User } from '../../entities';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Branch])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}

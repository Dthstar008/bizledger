import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../../entities';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { BranchContextService } from './branch-context.service';
import { BranchContextGuard } from './branch-context.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Branch])],
  controllers: [BranchesController],
  providers: [BranchesService, BranchContextService, BranchContextGuard],
  exports: [BranchContextService, BranchContextGuard],
})
export class BranchesModule {}

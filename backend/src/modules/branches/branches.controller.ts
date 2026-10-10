import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { CurrentBusinessId, CurrentRole } from '../../common/current-business.decorator';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  /** Owners see every branch; staff only see the one they're assigned to. */
  @Get()
  findAll(@CurrentBusinessId() businessId: string, @CurrentRole() role: Role, @Req() req: { user: { branchId?: string | null } }) {
    if (role !== Role.STAFF) return this.branchesService.findAll(businessId);
    return req.user.branchId ? this.branchesService.findAll(businessId, req.user.branchId) : [];
  }

  @Post()
  @Roles(Role.OWNER)
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(businessId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(
    @CurrentBusinessId() businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(businessId, id, dto);
  }
}

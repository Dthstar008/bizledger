import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { CurrentBusinessId } from '../../common/current-business.decorator';
import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('business')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('me')
  getProfile(@CurrentBusinessId() businessId: string) {
    return this.businessesService.findOne(businessId);
  }

  @Patch('me')
  @Roles(Role.OWNER)
  updateProfile(@CurrentBusinessId() businessId: string, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.update(businessId, dto);
  }
}

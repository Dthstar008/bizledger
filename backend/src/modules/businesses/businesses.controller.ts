import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentBusinessId } from '../../common/current-business.decorator';
import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('business')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('me')
  getProfile(@CurrentBusinessId() businessId: string) {
    return this.businessesService.findOne(businessId);
  }

  @Patch('me')
  updateProfile(@CurrentBusinessId() businessId: string, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.update(businessId, dto);
  }
}

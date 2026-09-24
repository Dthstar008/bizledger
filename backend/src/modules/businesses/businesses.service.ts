import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../entities';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(@InjectRepository(Business) private readonly businesses: Repository<Business>) {}

  async findOne(id: string): Promise<Business> {
    const business = await this.businesses.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(id: string, dto: UpdateBusinessDto): Promise<Business> {
    const business = await this.findOne(id);
    Object.assign(business, dto);
    return this.businesses.save(business);
  }
}

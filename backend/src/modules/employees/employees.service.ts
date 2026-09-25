import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Branch, Role, User } from '../../entities';
import { CreateEmployeeDto } from './dto/create-employee.dto';

export interface EmployeeView {
  id: string;
  name?: string;
  email: string;
  role: Role;
  branchId: string | null;
  createdAt: Date;
}

const toView = (u: User): EmployeeView => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  branchId: u.branchId ?? null,
  createdAt: u.createdAt,
});

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
  ) {}

  async findAll(businessId: string): Promise<EmployeeView[]> {
    const rows = await this.users.find({ where: { businessId }, order: { createdAt: 'ASC' } });
    return rows.map(toView);
  }

  async create(businessId: string, dto: CreateEmployeeDto): Promise<EmployeeView> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');

    const branch = dto.branchId
      ? await this.branches.findOne({ where: { id: dto.branchId, businessId } })
      : await this.branches.findOne({ where: { businessId, isDefault: true } });
    if (dto.branchId && !branch) throw new BadRequestException('Unknown branch');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.save(
      this.users.create({
        email: dto.email,
        passwordHash,
        name: dto.name,
        businessId,
        role: Role.STAFF,
        branchId: branch?.id ?? null,
      }),
    );
    return toView(user);
  }

  async remove(businessId: string, actorId: string, id: string): Promise<void> {
    const user = await this.users.findOne({ where: { id, businessId } });
    if (!user) throw new NotFoundException('Employee not found');
    if (user.id === actorId) throw new BadRequestException('You cannot remove your own account');
    if (user.role === Role.OWNER) throw new BadRequestException('Owner accounts cannot be removed');
    await this.users.delete({ id, businessId });
  }
}

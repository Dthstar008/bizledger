import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Branch, Role, User } from '../../entities';
import { passwordProblem } from '../../common/password-policy';
import { forgetCachedUser } from '../auth/jwt.strategy';
import { CreateEmployeeDto, ResetEmployeePasswordDto } from './dto/create-employee.dto';

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
    // Their next request is refused straight away rather than after the session cache expires.
    forgetCachedUser(id);
  }

  /**
   * The owner sets a new password for a staff member who has forgotten theirs
   * (staff emails may not be real inboxes, so this doesn't rely on email).
   * Signs the staff member out of every device.
   */
  async resetPassword(businessId: string, id: string, dto: ResetEmployeePasswordDto): Promise<void> {
    const user = await this.users.findOne({ where: { id, businessId } });
    if (!user) throw new NotFoundException('Employee not found');
    if (user.role !== Role.STAFF) {
      throw new BadRequestException('Owners change their own password from the Account screen');
    }
    const problem = passwordProblem(dto.password, { email: user.email });
    if (problem) throw new BadRequestException(problem);
    await this.users.update(user.id, {
      passwordHash: await bcrypt.hash(dto.password, 10),
      tokenVersion: (user.tokenVersion ?? 0) + 1,
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    });
    forgetCachedUser(user.id);
  }
}

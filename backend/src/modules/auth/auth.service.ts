import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Business, Branch, Role } from '../../entities';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { business, user } = await this.dataSource.transaction(async (manager) => {
      const business = await manager.save(
        manager.create(Business, {
          name: dto.businessName,
          ownerName: dto.ownerName,
          phone: dto.phone,
        }),
      );
      await manager.save(manager.create(Branch, { businessId: business.id, name: 'Main Branch', isDefault: true }));
      const user = await manager.save(
        manager.create(User, {
          email: dto.email,
          passwordHash,
          name: dto.ownerName,
          businessId: business.id,
          role: Role.OWNER,
          // DTO validation already requires this to be exactly `true`, so
          // this timestamp is an honest record of when that confirmation
          // actually happened, not just a UI gate.
          ageConfirmedAt: new Date(),
        }),
      );
      return { business, user };
    });

    return this.buildAuthResponse(user, business);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email }, relations: ['business'] });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildAuthResponse(user, user.business);
  }

  private buildAuthResponse(user: User, business: Business) {
    const accessToken = this.jwtService.sign({ sub: user.id, businessId: user.businessId });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId ?? null },
      business: { id: business.id, name: business.name },
    };
  }
}

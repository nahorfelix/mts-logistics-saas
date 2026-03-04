import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PlanType } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { BootstrapSuperAdminDto } from "./dto/bootstrap-super-admin.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterTenantDto } from "./dto/register-tenant.dto";
import { JwtPayload } from "./jwt-payload.type";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerTenant(dto: RegisterTenantDto): Promise<{
    tenantId: string;
    userId: string;
    accessToken: string;
  }> {
    this.validateRegisterDto(dto);

    const domain = dto.domain.toLowerCase().trim();
    const adminEmail = dto.adminEmail.toLowerCase().trim();

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { domain },
      select: { id: true },
    });
    if (existingTenant) {
      throw new ConflictException("Tenant domain is already in use.");
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.tenantName,
        domain,
        planType: (dto.planType ?? "STARTER") as PlanType,
      },
    });

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        fullName: dto.adminFullName,
        passwordHash,
        role: "ADMIN",
      },
    });

    const accessToken = await this.signJwt({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    });

    return {
      tenantId: tenant.id,
      userId: user.id,
      accessToken,
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; role: string }> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException("email and password are required.");
    }

    const email = dto.email.toLowerCase().trim();

    if (!dto.domain) {
      const superAdmin = await this.prisma.user.findFirst({
        where: { email, role: "SUPER_ADMIN" },
      });
      if (!superAdmin) {
        throw new UnauthorizedException("Invalid credentials.");
      }

      const passwordMatch = await bcrypt.compare(dto.password, superAdmin.passwordHash);
      if (!passwordMatch) {
        throw new UnauthorizedException("Invalid credentials.");
      }

      const accessToken = await this.signJwt({
        sub: superAdmin.id,
        tenantId: superAdmin.tenantId,
        email: superAdmin.email,
        role: superAdmin.role,
      });

      return { accessToken, role: superAdmin.role };
    }

    const domain = dto.domain.toLowerCase().trim();

    const tenant = await this.prisma.tenant.findUnique({ where: { domain }, select: { id: true } });
    if (!tenant) throw new UnauthorizedException("Invalid credentials.");

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const accessToken = await this.signJwt({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken, role: user.role };
  }

  async me(userId: string, tenantId?: string): Promise<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    tenantId: string | null;
    tenant: { name: string; domain: string } | null;
  }> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...(tenantId ? { tenantId } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        tenant: {
          select: {
            name: true,
            domain: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found in tenant.");
    }

    return user;
  }

  async bootstrapSuperAdmin(dto: BootstrapSuperAdminDto): Promise<{ email: string; role: string }> {
    const expectedKey = process.env.SUPER_ADMIN_SETUP_KEY ?? "set-super-admin-key";
    if (dto.setupKey !== expectedKey) {
      throw new UnauthorizedException("Invalid setup key.");
    }
    if (!dto.email || !dto.password || !dto.fullName) {
      throw new BadRequestException("email, fullName, and password are required.");
    }
    if (dto.password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters.");
    }

    const platformDomain = "platform.internal";
    let platformTenant = await this.prisma.tenant.findUnique({ where: { domain: platformDomain } });
    if (!platformTenant) {
      platformTenant = await this.prisma.tenant.create({
        data: { name: "Platform", domain: platformDomain, planType: "ENTERPRISE" },
      });
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findFirst({
      where: { email, role: "SUPER_ADMIN" },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("Super admin already exists for this email.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        tenantId: platformTenant.id,
        email,
        fullName: dto.fullName,
        passwordHash,
        role: "SUPER_ADMIN",
      },
      select: { email: true, role: true },
    });

    return created;
  }

  async createTenantUser(tenantId: string, dto: CreateUserDto) {
    if (!dto.email || !dto.password || !dto.fullName || !dto.role) {
      throw new BadRequestException("fullName, email, password and role are required.");
    }
    if (!["ADMIN", "DISPATCHER", "DRIVER"].includes(dto.role)) {
      throw new BadRequestException("Invalid role for tenant user.");
    }
    if (dto.password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters.");
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("User email already exists in this tenant.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const createdUser = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        fullName: dto.fullName,
        passwordHash,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
      },
    });

    if (dto.role === "DRIVER") {
      await this.prisma.driver.create({
        data: {
          tenantId,
          userId: createdUser.id,
          name: dto.fullName,
          license: `DRV-${Date.now()}`,
          phone: `+2547${Math.floor(10000000 + Math.random() * 89999999)}`,
          availability: "ONLINE",
        },
      });
    }

    return createdUser;
  }

  private async signJwt(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  private validateRegisterDto(dto: RegisterTenantDto): void {
    if (
      !dto.tenantName ||
      !dto.domain ||
      !dto.adminFullName ||
      !dto.adminEmail ||
      !dto.password
    ) {
      throw new BadRequestException(
        "tenantName, domain, adminFullName, adminEmail and password are required.",
      );
    }

    if (dto.password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters.");
    }
  }
}

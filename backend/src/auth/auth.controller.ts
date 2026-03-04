import { BadRequestException, Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Public } from "../common/auth/public.decorator";
import { Roles } from "../common/auth/roles.decorator";
import { SkipTenantScope } from "../common/tenant/skip-tenant-scope.decorator";
import { TenantRequest } from "../common/tenant/tenant-request.interface";
import { AuthService } from "./auth.service";
import { BootstrapSuperAdminDto } from "./dto/bootstrap-super-admin.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterTenantDto } from "./dto/register-tenant.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register-tenant")
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post("bootstrap-super-admin")
  bootstrapSuperAdmin(@Body() dto: BootstrapSuperAdminDto) {
    return this.authService.bootstrapSuperAdmin(dto);
  }

  @Post("users")
  @Roles("ADMIN")
  createTenantUser(@Req() req: TenantRequest, @Body() dto: CreateUserDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException("Authenticated tenant is required.");
    }
    return this.authService.createTenantUser(tenantId, dto);
  }

  @Get("me")
  @SkipTenantScope()
  me(@Req() req: TenantRequest) {
    const user = req.user as { sub: string; tenantId?: string };
    return this.authService.me(user.sub, user.tenantId);
  }
}

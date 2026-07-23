import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { AuthResult, TokenPair } from './auth.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayloadUser } from './strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Register a new user account' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<User> {
    return await this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Log in and receive access + refresh tokens' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    const userAgent = req.headers['user-agent'];
    return await this.authService.login(loginDto, userAgent);
  }

  @ApiOperation({ summary: 'Issue a new access token using a refresh token' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return await this.authService.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Revoke the current refresh token (single-device logout)' })
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  // ─── Authenticated endpoints ──────────────────────────────────────────────

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user (global logout)' })
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: JwtPayloadUser): Promise<void> {
    await this.authService.logoutAll(user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayloadUser) {
    const fullUser = await this.usersService.findOneById(user.id);
    if (fullUser) {
      delete fullUser.password;
    }
    return fullUser;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the user profile with workspace and team details' })
  @UseGuards(JwtAuthGuard)
  @Get('profile/details')
  async getProfileDetails(@CurrentUser() user: JwtPayloadUser) {
    return await this.workspacesService.getUserProfileDetails(user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update username or avatar URL' })
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayloadUser,
    @Body() body: { username?: string; avatarUrl?: string },
  ) {
    return await this.usersService.update(user.id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current user password' })
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      user.id,
      dto.oldPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }
}

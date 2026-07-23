import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    isSuperAdmin: boolean;
    needsPasswordChange?: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateTokenPair(user: User): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      username: user.username,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'super-secret-key-12345'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m') as any,
    });

    // Generate a cryptographically random refresh token
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');

    // Persist hashed version
    const expiresInDays = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION_DAYS', '7'),
      10,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt,
      isRevoked: false,
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    return { accessToken, refreshToken: rawRefreshToken };
  }

  // ─── Auth flows ───────────────────────────────────────────────────────────

  async register(registerDto: RegisterDto): Promise<User> {
    const { username, password } = registerDto;
    return await this.usersService.create(username, password);
  }

  async login(loginDto: LoginDto, userAgent?: string): Promise<AuthResult> {
    const { username, password } = loginDto;
    const user = await this.usersService.findOneByUsername(username);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokenPair(user);

    // Store userAgent hint if provided
    if (userAgent) {
      const hash = this.hashToken(tokens.refreshToken);
      await this.refreshTokenRepo.update({ tokenHash: hash }, { userAgent });
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl ?? undefined,
        isSuperAdmin: user.isSuperAdmin,
        needsPasswordChange: user.needsPasswordChange,
      },
    };
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const hash = this.hashToken(rawRefreshToken);

    const tokenEntity = await this.refreshTokenRepo.findOne({
      where: { tokenHash: hash },
      relations: { user: true },
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (tokenEntity.isRevoked) {
      // Possible token reuse — revoke ALL tokens for this user (security sweep)
      await this.refreshTokenRepo.update(
        { userId: tokenEntity.userId },
        { isRevoked: true },
      );
      throw new ForbiddenException(
        'Refresh token has been revoked. Please log in again.',
      );
    }

    if (new Date() > tokenEntity.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Rotate: revoke the old token and issue a fresh pair
    tokenEntity.isRevoked = true;
    await this.refreshTokenRepo.save(tokenEntity);

    return this.generateTokenPair(tokenEntity.user);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const hash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepo.update({ tokenHash: hash }, { isRevoked: true });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepo.update({ userId }, { isRevoked: true });
  }

  /** Purge expired tokens — can be called by a cron job */
  async purgeExpiredTokens(): Promise<void> {
    await this.refreshTokenRepo.delete({ expiresAt: LessThan(new Date()) });
  }
}

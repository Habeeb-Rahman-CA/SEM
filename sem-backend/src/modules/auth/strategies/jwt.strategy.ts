import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { SystemConfigService } from '../../workspaces/system-config/system-config.service';

export interface JwtPayloadUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly systemConfigService: SystemConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'super-secret-key-12345',
      ),
    });
  }

  async validate(payload: {
    sub: string;
    username: string;
    isSuperAdmin: boolean;
    logoutEventId?: string;
  }): Promise<JwtPayloadUser> {
    if (payload.logoutEventId) {
      const configs = await this.systemConfigService.getSystemConfigs();
      const currentLogoutEventId = configs['global_logout_event_id'] || '1';

      if (
        parseInt(payload.logoutEventId, 10) < parseInt(currentLogoutEventId, 10)
      ) {
        throw new UnauthorizedException(
          'Session has been invalidated by a Global Force Logout event. Please sign in again.',
        );
      }
    }

    const user = await this.usersService.findOneById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found or token invalid');
    }
    // This object is attached to req.user by Passport
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-key-12345'),
    });
  }

  async validate(payload: { sub: string; username: string; isSuperAdmin: boolean }): Promise<JwtPayloadUser> {
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

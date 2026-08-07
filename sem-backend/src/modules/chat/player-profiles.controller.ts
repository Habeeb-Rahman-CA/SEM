import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayerProfilesService } from './player-profiles.service';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayerProfilesController {
  constructor(private readonly service: PlayerProfilesService) {}

  @Get('profile/:handle')
  async getProfile(@Param('handle') handle: string) {
    return await this.service.getProfileByHandle(handle);
  }
}

import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserPreferencesService } from './user-preferences.service';

@Controller('users/:userId/preferences')
@UseGuards(JwtAuthGuard)
export class UserPreferencesController {
  constructor(private readonly service: UserPreferencesService) {}

  @Get()
  async getPreferences(@Param('userId') userId: string) {
    return await this.service.getPreferences(userId);
  }

  @Put()
  async updatePreferences(@Param('userId') userId: string, @Body() body: any) {
    return await this.service.updatePreferences(userId, body);
  }
}

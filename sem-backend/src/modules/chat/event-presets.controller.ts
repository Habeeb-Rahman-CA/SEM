import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventPresetsService } from './event-presets.service';

@Controller('event-presets')
@UseGuards(JwtAuthGuard)
export class EventPresetsController {
  constructor(private readonly service: EventPresetsService) {}

  @Get()
  async getPresets() {
    return await this.service.getPresets();
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdvertisementsService } from './advertisements.service';
import {
  CreateAdvertisementDto,
  UpdateAdvertisementDto,
} from './dto/advertisement.dto';

@ApiTags('advertisements')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/ads')
@UseGuards(JwtAuthGuard)
export class AdvertisementsController {
  constructor(private readonly adsService: AdvertisementsService) {}

  @Get()
  @ApiOperation({ summary: 'List advertisements for the workspace' })
  @ApiParam({ name: 'workspaceId' })
  list(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.adsService.list(workspaceId, req.user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Aggregate campaign stats — impressions, clicks, CTR',
  })
  stats(@Param('workspaceId') workspaceId: string, @Request() req: any) {
    return this.adsService.getStats(workspaceId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new banner advertisement' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateAdvertisementDto,
    @Request() req: any,
  ) {
    return this.adsService.create(workspaceId, dto, req.user.id);
  }

  @Patch(':adId')
  @ApiOperation({ summary: 'Update a banner advertisement' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('adId') adId: string,
    @Body() dto: UpdateAdvertisementDto,
    @Request() req: any,
  ) {
    return this.adsService.update(workspaceId, adId, dto, req.user.id);
  }

  @Delete(':adId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an advertisement' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('adId') adId: string,
    @Request() req: any,
  ) {
    return this.adsService.remove(workspaceId, adId, req.user.id);
  }
}

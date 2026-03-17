import { Controller, Get, Post, Param, Body, Put, Delete } from '@nestjs/common';
import { ChargerService } from './charger.service';

@Controller('api/chargers')
export class ChargerController {
  constructor(private readonly chargerService: ChargerService) {}

  @Get()
  async getAllChargers() {
    return await this.chargerService.getAllChargers();
  }

  @Get(':id')
  async getCharger(@Param('id') id: string) {
    return await this.chargerService.getCharger(id);
  }

  @Get(':id/sessions')
  async getChargerSessions(@Param('id') id: string) {
    const sessions = await this.chargerService.getAllSessions();
    return sessions.filter(session => session.chargerId === id);
  }

  @Get('statistics')
  async getStatistics() {
    return await this.chargerService.getStatistics();
  }

  @Get('sessions/active')
  async getActiveSessions() {
    return await this.chargerService.getActiveSessions();
  }

  @Post(':id/remote-start')
  async remoteStart(@Param('id') id: string, @Body() body: { connectorId: number; idTag: string }) {
    return await this.chargerService.remoteStartTransaction(id, body.connectorId, body.idTag);
  }

  @Post(':id/remote-stop')
  async remoteStop(@Param('id') id: string, @Body() body: { transactionId: string }) {
    return await this.chargerService.remoteStopTransaction(id, body.transactionId);
  }

  @Post(':id/reset')
  async reset(@Param('id') id: string, @Body() body: { type?: 'Hard' | 'Soft' }) {
    return await this.chargerService.resetCharger(id, body.type);
  }
}

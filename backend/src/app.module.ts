import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { ChargerService } from './chargers/charger.service';
import { ChargerController } from './chargers/charger.controller';
import { OcppGateway } from './ocpp/ocpp.gateway';
import { RealtimeGateway } from './realtime/realtime.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController, ChargerController],
  providers: [AppService, DatabaseService, ChargerService, OcppGateway, RealtimeGateway],
})
export class AppModule {}

import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChargerService } from '../chargers/charger.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime'
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('RealtimeGateway');
  private connectedClients: Set<Socket> = new Set();

  constructor(private chargerService: ChargerService) {
    // Set up the server reference in charger service for broadcasting
    this.chargerService.setServer(this.server);
  }

  afterInit(server: Server) {
    this.logger.log('Dashboard Realtime WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Dashboard client connected: ${client.id}`);
    this.connectedClients.add(client);

    // Send initial data to the newly connected client
    this.sendInitialData(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Dashboard client disconnected: ${client.id}`);
    this.connectedClients.delete(client);
  }

  private async sendInitialData(client: Socket) {
    try {
      // Send all chargers data
      const chargers = await this.chargerService.getAllChargers();
      client.emit('chargers.initial', chargers);

      // Send active sessions
      const activeSessions = await this.chargerService.getActiveSessions();
      client.emit('sessions.active', activeSessions);

      // Send statistics
      const stats = await this.chargerService.getStatistics();
      client.emit('statistics', stats);

      this.logger.log(`Initial data sent to client ${client.id}`);
    } catch (error) {
      this.logger.error(`Error sending initial data: ${error.message}`);
    }
  }

  // Handle client requests
  @SubscribeMessage('request.chargers')
  async handleRequestChargers(client: Socket) {
    this.sendChargersData(client);
  }

  @SubscribeMessage('request.sessions')
  async handleRequestSessions(client: Socket) {
    this.sendSessionsData(client);
  }

  @SubscribeMessage('request.statistics')
  async handleRequestStatistics(client: Socket) {
    this.sendStatisticsData(client);
  }

  @SubscribeMessage('remote.start')
  async handleRemoteStart(client: Socket, data: { chargerId: string; connectorId: number; idTag: string }) {
    try {
      const success = await this.chargerService.remoteStartTransaction(data.chargerId, data.connectorId, data.idTag);
      
      client.emit('remote.start.response', {
        success,
        chargerId: data.chargerId,
        connectorId: data.connectorId
      });
      
      if (success) {
        this.logger.log(`Remote start initiated for charger ${data.chargerId}, connector ${data.connectorId}`);
      }
    } catch (error) {
      client.emit('remote.start.response', {
        success: false,
        chargerId: data.chargerId,
        error: error.message
      });
    }
  }

  @SubscribeMessage('remote.stop')
  async handleRemoteStop(client: Socket, data: { chargerId: string; transactionId: string }) {
    try {
      const success = await this.chargerService.remoteStopTransaction(data.chargerId, data.transactionId);
      
      client.emit('remote.stop.response', {
        success,
        chargerId: data.chargerId,
        transactionId: data.transactionId
      });
      
      if (success) {
        this.logger.log(`Remote stop initiated for charger ${data.chargerId}, transaction ${data.transactionId}`);
      }
    } catch (error) {
      client.emit('remote.stop.response', {
        success: false,
        chargerId: data.chargerId,
        error: error.message
      });
    }
  }

  @SubscribeMessage('remote.reset')
  async handleRemoteReset(client: Socket, data: { chargerId: string; type?: 'Hard' | 'Soft' }) {
    try {
      const success = await this.chargerService.resetCharger(data.chargerId, data.type);
      
      client.emit('remote.reset.response', {
        success,
        chargerId: data.chargerId
      });
      
      if (success) {
        this.logger.log(`Remote reset initiated for charger ${data.chargerId}, type: ${data.type || 'Soft'}`);
      }
    } catch (error) {
      client.emit('remote.reset.response', {
        success: false,
        chargerId: data.chargerId,
        error: error.message
      });
    }
  }

  private async sendChargersData(client?: Socket) {
    const chargers = await this.chargerService.getAllChargers();
    const event = 'chargers.updated';
    
    if (client) {
      client.emit(event, chargers);
    } else {
      this.server.emit(event, chargers);
    }
  }

  private async sendSessionsData(client?: Socket) {
    const activeSessions = await this.chargerService.getActiveSessions();
    const event = 'sessions.active';
    
    if (client) {
      client.emit(event, activeSessions);
    } else {
      this.server.emit(event, activeSessions);
    }
  }

  private async sendStatisticsData(client?: Socket) {
    const stats = await this.chargerService.getStatistics();
    const event = 'statistics';
    
    if (client) {
      client.emit(event, stats);
    } else {
      this.server.emit(event, stats);
    }
  }

  // Public methods for other services to broadcast updates
  broadcastChargerUpdate(chargerId: string, data: any) {
    this.server.emit('charger.updated', { chargerId, ...data });
  }

  broadcastSessionUpdate(sessionId: string, data: any) {
    this.server.emit('session.updated', { sessionId, ...data });
  }

  broadcastStatistics(stats: any) {
    this.server.emit('statistics', stats);
  }
}

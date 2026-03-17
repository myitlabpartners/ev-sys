import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChargerService } from '../chargers/charger.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ocpp'
})
export class OcppGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('OcppGateway');
  private chargerSockets: Map<string, Socket> = new Map();

  constructor(private chargerService: ChargerService) {}

  afterInit(server: Server) {
    this.logger.log('OCPP WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const chargerId = this.extractChargerId(client.handshake.url);
    
    if (!chargerId) {
      this.logger.warn(`Connection rejected - no charger ID found in URL: ${client.handshake.url}`);
      client.disconnect();
      return;
    }

    this.logger.log(`Charger ${chargerId} connected`);
    
    // Store socket connection
    this.chargerSockets.set(chargerId, client);
    
    // Update charger state to online
    await this.chargerService.updateChargerStatus(chargerId, 'online');
    
    // Send to dashboard
    this.server.emit('charger.connected', { chargerId, timestamp: new Date() });
  }

  async handleDisconnect(client: Socket) {
    const chargerId = this.findChargerIdBySocket(client);
    
    if (chargerId) {
      this.logger.log(`Charger ${chargerId} disconnected`);
      
      // Remove socket connection
      this.chargerSockets.delete(chargerId);
      
      // Update charger state to offline
      await this.chargerService.updateChargerStatus(chargerId, 'offline');
      
      // Send to dashboard
      this.server.emit('charger.disconnected', { chargerId, timestamp: new Date() });
    }
  }

  // Handle OCPP messages
  async handleOCPPMessage(client: Socket, message: any) {
    const chargerId = this.findChargerIdBySocket(client);
    
    if (!chargerId) {
      this.logger.warn(`Received message from unregistered socket`);
      return;
    }

    try {
      const [messageTypeId, uniqueId, action, payload] = message;
      
      this.logger.debug(`OCPP message from ${chargerId}: [${messageTypeId}, ${uniqueId}, ${action}]`);

      switch (action) {
        case 'BootNotification':
          await this.handleBootNotification(chargerId, uniqueId, payload, client);
          break;
        case 'Heartbeat':
          await this.handleHeartbeat(chargerId, uniqueId, payload, client);
          break;
        case 'StatusNotification':
          await this.handleStatusNotification(chargerId, uniqueId, payload, client);
          break;
        case 'Authorize':
          await this.handleAuthorize(chargerId, uniqueId, payload, client);
          break;
        case 'StartTransaction':
          await this.handleStartTransaction(chargerId, uniqueId, payload, client);
          break;
        case 'StopTransaction':
          await this.handleStopTransaction(chargerId, uniqueId, payload, client);
          break;
        case 'MeterValues':
          await this.handleMeterValues(chargerId, uniqueId, payload, client);
          break;
        default:
          this.logger.warn(`Unsupported OCPP action: ${action}`);
          this.sendOCPPResponse(client, uniqueId, 'NotImplemented', {});
      }
    } catch (error) {
      this.logger.error(`Error processing OCPP message: ${error.message}`);
    }
  }

  private async handleBootNotification(chargerId: string, uniqueId: any, payload: any, client: Socket) {
    const { chargePointVendor, chargePointModel, chargePointSerialNumber } = payload;
    
    // Update charger info
    await this.chargerService.updateChargerInfo(chargerId, {
      vendor: chargePointVendor,
      model: chargePointModel,
      serialNumber: chargePointSerialNumber
    });

    // Send response
    const response = {
      status: 'Accepted',
      currentTime: new Date().toISOString(),
      interval: 60
    };

    this.sendOCPPResponse(client, uniqueId, 'BootNotification', response);
    
    // Notify dashboard
    this.server.emit('charger.boot.completed', { chargerId, payload: response });
  }

  private async handleHeartbeat(chargerId: string, uniqueId: any, payload: any, client: Socket) {
    // Update last heartbeat
    await this.chargerService.updateHeartbeat(chargerId);

    // Send response with current time
    const response = {
      currentTime: new Date().toISOString()
    };

    this.sendOCPPResponse(client, uniqueId, 'Heartbeat', response);
    
    // Notify dashboard
    this.server.emit('charger.heartbeat', { chargerId, timestamp: new Date() });
  }

  private async handleStatusNotification(chargerId: string, uniqueId: any, payload: any, client: Socket) {
    const { connectorId, status, errorCode, info, timestamp, vendorId } = payload;
    
    // Update connector status
    await this.chargerService.updateConnectorStatus(chargerId, connectorId, status, errorCode);

    // StatusNotification doesn't require a response
    // Notify dashboard
    this.server.emit('charger.status.updated', { 
      chargerId, 
      connectorId, 
      status, 
      errorCode, 
      timestamp: new Date() 
    });
  }

  private async handleAuthorize(chargerId: string, uniqueId: any, payload: any, client: Socket) {
    const { idTag } = payload;
    
    // Simple authorization logic - accept all for now
    const response = {
      idTagInfo: {
        status: 'Accepted'
      }
    };

    this.sendOCPPResponse(client, uniqueId, 'Authorize', response);
    
    // Notify dashboard
    this.server.emit('charger.authorize', { chargerId, idTag, status: 'Accepted' });
  }

  private async handleStartTransaction(chargerId: string, uniqueId: any, payload: any, client: Socket) {
    const { connectorId, idTag, timestamp, meterStart, reservationId } = payload;
    
    // Create session
    const session = await this.chargerService.startSession(chargerId, connectorId, idTag, meterStart, timestamp);
    
    const response = {
      transactionId: session.id,
      idTagInfo: {
        status: 'Accepted'
      }
    };

    this.sendOCPPResponse(client, uniqueId, 'StartTransaction', response);
    
    // Notify dashboard
    this.server.emit('charger.session.started', { 
      chargerId, 
      connectorId, 
      transactionId: session.id,
      idTag,
      timestamp: new Date()
    });
  }

  private async handleStopTransaction(chargerId: string, uniqueId: any, payload: any, client: Socket) {
    const { transactionId, idTag, timestamp, meterStop, reason } = payload;
    
    // End session
    const session = await this.chargerService.endSession(transactionId, meterStop, reason);
    
    const response = {
      idTagInfo: {
        status: 'Accepted'
      }
    };

    this.sendOCPPResponse(client, uniqueId, 'StopTransaction', response);
    
    // Notify dashboard
    this.server.emit('charger.session.stopped', { 
      chargerId, 
      transactionId,
      idTag,
      energy: session.energy,
      timestamp: new Date()
    });
  }

  private async handleMeterValues(chargerId: string, uniqueId: any, payload: any, client: Socket) {
    const { connectorId, transactionId, meterValue } = payload;
    
    // Update meter values
    await this.chargerService.updateMeterValues(chargerId, connectorId, transactionId, meterValue);

    // MeterValues doesn't require a response
    // Notify dashboard
    this.server.emit('charger.meter.updated', { 
      chargerId, 
      connectorId, 
      transactionId,
      meterValue,
      timestamp: new Date()
    });
  }

  private sendOCPPResponse(client: Socket, uniqueId: any, action: string, payload: any) {
    const response = [3, uniqueId, action, payload];
    client.send(JSON.stringify(response));
  }

  // Remote control methods
  async sendRemoteStartTransaction(chargerId: string, connectorId: number, idTag: string): Promise<boolean> {
    const socket = this.chargerSockets.get(chargerId);
    if (!socket) {
      return false;
    }

    const message = [2, this.generateUniqueId(), 'RemoteStartTransaction', {
      connectorId,
      idTag
    }];

    socket.send(JSON.stringify(message));
    return true;
  }

  async sendRemoteStopTransaction(chargerId: string, transactionId: string): Promise<boolean> {
    const socket = this.chargerSockets.get(chargerId);
    if (!socket) {
      return false;
    }

    const message = [2, this.generateUniqueId(), 'RemoteStopTransaction', {
      transactionId
    }];

    socket.send(JSON.stringify(message));
    return true;
  }

  async sendReset(chargerId: string, type: 'Hard' | 'Soft' = 'Soft'): Promise<boolean> {
    const socket = this.chargerSockets.get(chargerId);
    if (!socket) {
      return false;
    }

    const message = [2, this.generateUniqueId(), 'Reset', { type }];
    socket.send(JSON.stringify(message));
    return true;
  }

  private extractChargerId(url: string): string | null {
    // Extract charger ID from URL like /ocpp/ESP32_001
    const match = url.match(/\/ocpp\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private findChargerIdBySocket(socket: Socket): string | null {
    for (const [chargerId, storedSocket] of this.chargerSockets.entries()) {
      if (storedSocket === socket) {
        return chargerId;
      }
    }
    return null;
  }

  private generateUniqueId(): string {
    return Date.now().toString();
  }
}

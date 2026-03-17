import { Injectable, Logger } from '@nestjs/common';
// import { Server } from 'socket.io';

export interface Charger {
  id: string;
  name?: string;
  status: 'online' | 'offline';
  vendor?: string;
  model?: string;
  serialNumber?: string;
  connectors: Connector[];
  lastHeartbeat?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Connector {
  id: number;
  status: 'Available' | 'Occupied' | 'Faulted' | 'Unavailable' | 'Preparing';
  errorCode?: string;
  currentSession?: Session;
  maxCurrent: number;
}

export interface Session {
  id: string;
  chargerId: string;
  connectorId: number;
  idTag: string;
  startTime: Date;
  endTime?: Date;
  startMeterValue: number;
  endMeterValue?: number;
  energy?: number;
  power?: number;
  status: 'Active' | 'Completed';
}

export interface MeterValue {
  timestamp: Date;
  value: number;
  unit: string;
}

@Injectable()
export class ChargerService {
  private readonly logger = new Logger(ChargerService.name);
  private chargers: Map<string, Charger> = new Map();
  private sessions: Map<string, Session> = new Map();
  private server: any;

  constructor() {
    this.initializeMockData();
  }

  setServer(server: any) {
    this.server = server;
  }

  private initializeMockData() {
    // Create some mock chargers for testing
    const mockChargers: Charger[] = [
      {
        id: 'ESP32_001',
        name: 'Main Entrance Charger 1',
        status: 'offline',
        vendor: 'OpenEVSE',
        model: 'ESP32 Charger',
        serialNumber: 'ESP32-001-2024',
        connectors: [
          { id: 1, status: 'Available', maxCurrent: 32 },
          { id: 2, status: 'Available', maxCurrent: 32 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ESP32_002',
        name: 'Main Entrance Charger 2',
        status: 'offline',
        vendor: 'OpenEVSE',
        model: 'ESP32 Charger',
        serialNumber: 'ESP32-002-2024',
        connectors: [
          { id: 1, status: 'Available', maxCurrent: 32 },
          { id: 2, status: 'Available', maxCurrent: 32 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ESP32_003',
        name: 'Parking Lot A Charger 1',
        status: 'offline',
        vendor: 'OpenEVSE',
        model: 'ESP32 Charger',
        serialNumber: 'ESP32-003-2024',
        connectors: [
          { id: 1, status: 'Available', maxCurrent: 32 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockChargers.forEach(charger => {
      this.chargers.set(charger.id, charger);
    });

    this.logger.log(`Initialized ${mockChargers.length} mock chargers`);
  }

  // Charger management
  async getAllChargers(): Promise<Charger[]> {
    return Array.from(this.chargers.values());
  }

  async getCharger(chargerId: string): Promise<Charger | null> {
    return this.chargers.get(chargerId) || null;
  }

  async updateChargerStatus(chargerId: string, status: 'online' | 'offline'): Promise<void> {
    const charger = this.chargers.get(chargerId);
    if (charger) {
      charger.status = status;
      charger.updatedAt = new Date();
      
      if (status === 'offline') {
        // Set all connectors to unavailable when charger goes offline
        charger.connectors.forEach(connector => {
          if (connector.status !== 'Faulted') {
            connector.status = 'Unavailable';
          }
        });
      }
      
      this.logger.log(`Charger ${chargerId} status updated to ${status}`);
    }
  }

  async updateChargerInfo(chargerId: string, info: { vendor?: string; model?: string; serialNumber?: string }): Promise<void> {
    const charger = this.chargers.get(chargerId);
    if (charger) {
      Object.assign(charger, info);
      charger.updatedAt = new Date();
      this.logger.log(`Charger ${chargerId} info updated: ${JSON.stringify(info)}`);
    }
  }

  async updateHeartbeat(chargerId: string): Promise<void> {
    const charger = this.chargers.get(chargerId);
    if (charger) {
      charger.lastHeartbeat = new Date();
      charger.updatedAt = new Date();
    }
  }

  // Connector management
  async updateConnectorStatus(chargerId: string, connectorId: number, status: string, errorCode?: string): Promise<void> {
    const charger = this.chargers.get(chargerId);
    if (charger) {
      const connector = charger.connectors.find(c => c.id === connectorId);
      if (connector) {
        connector.status = status as any;
        connector.errorCode = errorCode;
        charger.updatedAt = new Date();
        
        this.logger.log(`Charger ${chargerId} connector ${connectorId} status updated to ${status}`);
      }
    }
  }

  // Session management
  async startSession(chargerId: string, connectorId: number, idTag: string, meterStart: number, timestamp: string): Promise<Session> {
    const sessionId = this.generateSessionId();
    const session: Session = {
      id: sessionId,
      chargerId,
      connectorId,
      idTag,
      startTime: new Date(timestamp),
      startMeterValue: meterStart,
      status: 'Active'
    };

    this.sessions.set(sessionId, session);

    // Update connector status
    await this.updateConnectorStatus(chargerId, connectorId, 'Occupied');

    // Update connector with session reference
    const charger = this.chargers.get(chargerId);
    if (charger) {
      const connector = charger.connectors.find(c => c.id === connectorId);
      if (connector) {
        connector.currentSession = session;
      }
    }

    this.logger.log(`Session started: ${sessionId} for charger ${chargerId}`);
    return session;
  }

  async endSession(transactionId: string, meterStop: number, reason?: string): Promise<Session> {
    const session = this.sessions.get(transactionId);
    if (session) {
      session.endTime = new Date();
      session.endMeterValue = meterStop;
      session.energy = meterStop - session.startMeterValue;
      session.status = 'Completed';

      // Update connector status
      const charger = this.chargers.get(session.chargerId);
      if (charger) {
        const connector = charger.connectors.find(c => c.id === session.connectorId);
        if (connector) {
          connector.status = 'Available';
          connector.currentSession = undefined;
        }
      }

      this.logger.log(`Session ended: ${transactionId}, energy: ${session.energy} Wh`);
    }

    return session;
  }

  async updateMeterValues(chargerId: string, connectorId: number, transactionId: string, meterValue: any): Promise<void> {
    const session = this.sessions.get(transactionId);
    if (session) {
      // Extract power and energy from meter values
      const values = meterValue.values || [];
      const powerValue = values.find((v: any) => v.measurand === 'Power.Active.Import');
      const energyValue = values.find((v: any) => v.measurand === 'Energy.Active.Import.Register');

      if (powerValue) {
        session.power = parseFloat(powerValue.value);
      }
      if (energyValue) {
        session.energy = parseFloat(energyValue.value);
      }

      // Update charger with current power
      const charger = this.chargers.get(chargerId);
      if (charger && session.power) {
        // Store current power (could be used for dashboard)
        (charger as any).currentPower = session.power;
      }
    }
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async getActiveSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => session.status === 'Active');
  }

  // Remote control methods
  async remoteStartTransaction(chargerId: string, connectorId: number, idTag: string): Promise<boolean> {
    // This would be called by the OCPP gateway to send RemoteStartTransaction
    // The actual sending is handled by the gateway
    this.logger.log(`Remote start transaction requested for charger ${chargerId}, connector ${connectorId}`);
    return true;
  }

  async remoteStopTransaction(chargerId: string, transactionId: string): Promise<boolean> {
    // This would be called by the OCPP gateway to send RemoteStopTransaction
    // The actual sending is handled by the gateway
    this.logger.log(`Remote stop transaction requested for charger ${chargerId}, transaction ${transactionId}`);
    return true;
  }

  async resetCharger(chargerId: string, type: 'Hard' | 'Soft' = 'Soft'): Promise<boolean> {
    // This would be called by the OCPP gateway to send Reset
    // The actual sending is handled by the gateway
    this.logger.log(`Reset requested for charger ${chargerId}, type: ${type}`);
    
    // Update charger status to show it's resetting
    const charger = this.chargers.get(chargerId);
    if (charger) {
      charger.connectors.forEach(connector => {
        connector.status = 'Unavailable';
      });
    }
    
    return true;
  }

  // Utility methods
  private generateSessionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Statistics
  async getStatistics(): Promise<any> {
    const chargers = Array.from(this.chargers.values());
    const sessions = Array.from(this.sessions.values());
    
    return {
      totalChargers: chargers.length,
      onlineChargers: chargers.filter(c => c.status === 'online').length,
      offlineChargers: chargers.filter(c => c.status === 'offline').length,
      activeSessions: sessions.filter(s => s.status === 'Active').length,
      totalSessions: sessions.length,
      totalEnergy: sessions.reduce((sum, s) => sum + (s.energy || 0), 0)
    };
  }
}

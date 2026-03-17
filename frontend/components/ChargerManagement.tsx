'use client'

import { useState, useEffect, useRef } from 'react'
import { getApiUrl } from '@/src/config/api'
import { io, Socket } from 'socket.io-client'

interface Charger {
  id: string
  name: string
  status: 'online' | 'offline'
  connectors: Connector[]
  currentSession: Session | null
  lastHeartbeat: string
  power: number
  energy: number
  faults: Fault[]
  vendor?: string
  model?: string
  serialNumber?: string
  createdAt: string
  updatedAt: string
}

interface Connector {
  id: number
  status: 'Available' | 'Occupied' | 'Faulted' | 'Unavailable' | 'Preparing'
  currentSession: Session | null
  maxCurrent: number
  errorCode?: string
}

interface Session {
  id: string
  chargerId: string
  connectorId: number
  idTag: string
  startTime: string
  endTime?: string
  startMeterValue: number
  endMeterValue?: number
  energy?: number
  power?: number
  status: 'Active' | 'Completed'
}

interface Fault {
  id: string
  code: string
  message: string
  severity: 'warning' | 'error' | 'critical'
  timestamp: string
}

export default function ChargerManagement() {
  const [chargers, setChargers] = useState<Charger[]>([])
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [statistics, setStatistics] = useState<any>(null)

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(getApiUrl(''), {
      namespace: '/realtime',
      transports: ['websocket'],
      upgrade: false
    })

    newSocket.on('connect', () => {
      console.log('Connected to dashboard realtime server')
      setConnectionStatus('connected')
      setIsLoading(false)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from dashboard realtime server')
      setConnectionStatus('disconnected')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnectionStatus('disconnected')
      setIsLoading(false)
    })

    // Listen for initial data
    newSocket.on('chargers.initial', (data: Charger[]) => {
      console.log('Received initial chargers data:', data)
      setChargers(data)
    })

    newSocket.on('sessions.active', (data: Session[]) => {
      console.log('Received active sessions:', data)
      setActiveSessions(data)
    })

    newSocket.on('statistics', (data: any) => {
      console.log('Received statistics:', data)
      setStatistics(data)
    })

    // Listen for real-time updates
    newSocket.on('charger.connected', (data: { chargerId: string; timestamp: string }) => {
      console.log('Charger connected:', data)
      updateChargerStatus(data.chargerId, 'online', data.timestamp)
    })

    newSocket.on('charger.disconnected', (data: { chargerId: string; timestamp: string }) => {
      console.log('Charger disconnected:', data)
      updateChargerStatus(data.chargerId, 'offline', data.timestamp)
    })

    newSocket.on('charger.boot.completed', (data: { chargerId: string; payload: any }) => {
      console.log('Charger boot completed:', data)
      updateChargerInfo(data.chargerId, data.payload)
    })

    newSocket.on('charger.heartbeat', (data: { chargerId: string; timestamp: string }) => {
      console.log('Charger heartbeat:', data)
      updateChargerHeartbeat(data.chargerId, data.timestamp)
    })

    newSocket.on('charger.status.updated', (data: { chargerId: string; connectorId: number; status: string; errorCode?: string; timestamp: string }) => {
      console.log('Charger status updated:', data)
      updateConnectorStatus(data.chargerId, data.connectorId, data.status, data.errorCode)
    })

    newSocket.on('charger.session.started', (data: { chargerId: string; connectorId: number; transactionId: string; idTag: string; timestamp: string }) => {
      console.log('Session started:', data)
      // Refresh sessions list
      newSocket.emit('request.sessions')
    })

    newSocket.on('charger.session.stopped', (data: { chargerId: string; transactionId: string; idTag: string; energy: number; timestamp: string }) => {
      console.log('Session stopped:', data)
      // Refresh sessions list
      newSocket.emit('request.sessions')
    })

    newSocket.on('charger.meter.updated', (data: { chargerId: string; connectorId: number; transactionId: string; meterValue: any; timestamp: string }) => {
      console.log('Meter updated:', data)
      updateMeterValues(data.chargerId, data.connectorId, data.meterValue)
    })

    newSocket.on('chargers.updated', (data: Charger[]) => {
      console.log('Chargers updated:', data)
      setChargers(data)
    })

    newSocket.on('session.updated', (data: { sessionId: string; [key: string]: any }) => {
      console.log('Session updated:', data)
      // Refresh sessions list
      newSocket.emit('request.sessions')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const updateChargerStatus = (chargerId: string, status: 'online' | 'offline', timestamp: string) => {
    setChargers(prev => prev.map(charger => 
      charger.id === chargerId 
        ? { ...charger, status, lastHeartbeat: timestamp, updatedAt: timestamp }
        : charger
    ))
  }

  const updateChargerInfo = (chargerId: string, info: any) => {
    setChargers(prev => prev.map(charger => 
      charger.id === chargerId 
        ? { ...charger, ...info, updatedAt: new Date().toISOString() }
        : charger
    ))
  }

  const updateChargerHeartbeat = (chargerId: string, timestamp: string) => {
    setChargers(prev => prev.map(charger => 
      charger.id === chargerId 
        ? { ...charger, lastHeartbeat: timestamp, updatedAt: timestamp }
        : charger
    ))
  }

  const updateConnectorStatus = (chargerId: string, connectorId: number, status: string, errorCode?: string) => {
    setChargers(prev => prev.map(charger => 
      charger.id === chargerId 
        ? {
            ...charger,
            connectors: charger.connectors.map(connector =>
              connector.id === connectorId
                ? { ...connector, status: status as any, errorCode }
                : connector
            ),
            updatedAt: new Date().toISOString()
          }
        : charger
    ))
  }

  const updateMeterValues = (chargerId: string, connectorId: number, meterValue: any) => {
    setChargers(prev => prev.map(charger => 
      charger.id === chargerId 
        ? {
            ...charger,
            connectors: charger.connectors.map(connector =>
              connector.id === connectorId
                ? { 
                    ...connector,
                    currentSession: connector.currentSession 
                      ? { ...connector.currentSession, power: meterValue.values?.find((v: any) => v.measurand === 'Power.Active.Import')?.value }
                      : null
                  }
                : connector
            ),
            power: meterValue.values?.find((v: any) => v.measurand === 'Power.Active.Import')?.value || 0,
            updatedAt: new Date().toISOString()
          }
        : charger
    ))
  }

  const handleRemoteAction = (chargerId: string, action: 'start' | 'stop' | 'reset', data?: any) => {
    if (!socket) return

    const actionData = { chargerId, ...data }

    switch (action) {
      case 'start':
        socket.emit('remote.start', actionData)
        break
      case 'stop':
        socket.emit('remote.stop', actionData)
        break
      case 'reset':
        socket.emit('remote.reset', actionData)
        break
    }

    console.log(`Remote action ${action} for charger ${chargerId}`, actionData)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'Available':
        return 'text-green-600 bg-green-100'
      case 'offline':
      case 'Unavailable':
        return 'text-gray-600 bg-gray-100'
      case 'Occupied':
        return 'text-blue-600 bg-blue-100'
      case 'Faulted':
        return 'text-red-600 bg-red-100'
      case 'Preparing':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      case 'critical':
        return 'text-red-800 bg-red-200'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Loading chargers...</div>
          <div className="text-sm text-gray-500">Connection status: {connectionStatus}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Charger Management</h1>
              <p className="text-gray-600 mt-2">Real-time monitoring and control of EV chargers</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{statistics?.onlineChargers || 0}</div>
            <div className="text-gray-600">Online</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">{statistics?.offlineChargers || 0}</div>
            <div className="text-gray-600">Offline</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{statistics?.activeSessions || 0}</div>
            <div className="text-gray-600">Active Sessions</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{statistics?.totalEnergy || 0}</div>
            <div className="text-gray-600">Total Energy (kWh)</div>
          </div>
        </div>

        {/* Charger List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Charger List</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Charger ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connectors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Power
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Heartbeat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chargers.map((charger) => (
                  <tr key={charger.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {charger.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {charger.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(charger.status)}`}>
                        {charger.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        {charger.connectors.map((connector) => (
                          <span
                            key={connector.id}
                            className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(connector.status)}`}
                          >
                            {connector.id}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {charger.power ? `${charger.power.toFixed(1)} kW` : '0 kW'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {charger.lastHeartbeat ? new Date(charger.lastHeartbeat).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRemoteAction(charger.id, 'start', { connectorId: 1, idTag: 'TEST_TAG' })}
                          className="text-green-600 hover:text-green-900"
                          disabled={charger.status !== 'online'}
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleRemoteAction(charger.id, 'stop', { transactionId: 'TEST_TXN' })}
                          className="text-red-600 hover:text-red-900"
                          disabled={charger.status !== 'online'}
                        >
                          Stop
                        </button>
                        <button
                          onClick={() => handleRemoteAction(charger.id, 'reset', { type: 'Soft' })}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => setSelectedCharger(charger)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charger Details Modal */}
        {selectedCharger && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedCharger.name} ({selectedCharger.id})
                  </h3>
                  <button
                    onClick={() => setSelectedCharger(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Information */}
                  <div>
                    <h4 className="font-semibold mb-3">Status Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(selectedCharger.status)}`}>
                          {selectedCharger.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vendor:</span>
                        <span>{selectedCharger.vendor || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model:</span>
                        <span>{selectedCharger.model || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Serial:</span>
                        <span>{selectedCharger.serialNumber || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Heartbeat:</span>
                        <span>{selectedCharger.lastHeartbeat ? new Date(selectedCharger.lastHeartbeat).toLocaleString() : 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Power:</span>
                        <span>{selectedCharger.power ? `${selectedCharger.power.toFixed(1)} kW` : '0 kW'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Connectors */}
                  <div>
                    <h4 className="font-semibold mb-3">Connectors</h4>
                    <div className="space-y-3">
                      {selectedCharger.connectors.map((connector) => (
                        <div key={connector.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Connector {connector.id}</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(connector.status)}`}>
                              {connector.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>Max Current: {connector.maxCurrent}A</div>
                            {connector.errorCode && (
                              <div className="text-red-600">Error: {connector.errorCode}</div>
                            )}
                            {connector.currentSession && (
                              <div className="mt-2 p-2 bg-blue-50 rounded">
                                <div className="font-medium">Active Session</div>
                                <div>User: {connector.currentSession.idTag}</div>
                                <div>Duration: {Math.floor((Date.now() - new Date(connector.currentSession.startTime).getTime()) / 60000)}m</div>
                                <div>Power: {connector.currentSession.power ? `${connector.currentSession.power.toFixed(1)} kW` : 'N/A'}</div>
                                <div>Energy: {connector.currentSession.energy ? `${connector.currentSession.energy.toFixed(1)} kWh` : 'N/A'}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => handleRemoteAction(selectedCharger.id, 'start', { connectorId: 1, idTag: 'TEST_TAG' })}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={selectedCharger.status !== 'online'}
                  >
                    Start
                  </button>
                  <button
                    onClick={() => handleRemoteAction(selectedCharger.id, 'stop', { transactionId: 'TEST_TXN' })}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    disabled={selectedCharger.status !== 'online'}
                  >
                    Stop
                  </button>
                  <button
                    onClick={() => handleRemoteAction(selectedCharger.id, 'reset', { type: 'Soft' })}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setSelectedCharger(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

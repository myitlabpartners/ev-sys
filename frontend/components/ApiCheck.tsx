'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ApiCheck() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...')
  const [apiData, setApiData] = useState<any>(null)
  const [showSystemModal, setShowSystemModal] = useState<boolean>(false)
  const [dbStatus, setDbStatus] = useState<string>('Not checked')
  const [dbData, setDbData] = useState<any>(null)
  const [showDbWizard, setShowDbWizard] = useState<boolean>(false)

  useEffect(() => {
    // Check backend health
    fetch('http://localhost:3001/api/health')
      .then(response => response.json())
      .then(data => {
        setApiStatus('Connected')
        setApiData(data)
      })
      .catch(error => {
        setApiStatus('Error connecting to backend')
        console.error('API Error:', error)
      })
  }, [])

  const checkDatabaseConnection = () => {
    setDbStatus('Checking...')
    fetch('http://localhost:3001/api/database/health')
      .then(response => response.json())
      .then(data => {
        if (data.status === 'connected') {
          setDbStatus('Connected')
        } else {
          setDbStatus('Disconnected')
        }
        setDbData(data)
      })
      .catch(error => {
        setDbStatus('Error connecting to database')
        console.error('Database Error:', error)
      })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold mb-4 text-gray-800">API Status Check</h1>
        <p className="text-lg text-gray-600 mb-8">
          Monitor your backend connection and system health
        </p>
        
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Connection Status</h2>
          <p className="text-sm mb-4 text-gray-700">
            Status: <span className={`font-bold ${apiStatus === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
              {apiStatus}
            </span>
          </p>
          {apiData && (
            <div className="text-left mt-4 p-4 bg-gray-50 rounded border border-gray-300">
              <p className="text-sm font-semibold text-gray-800 mb-2">Backend Response:</p>
              <pre className="text-xs mt-2 whitespace-pre-wrap text-gray-700 bg-white p-3 rounded border border-gray-200">
                {JSON.stringify(apiData, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Backend Info</h3>
            <p className="text-sm text-gray-600">Server: http://localhost:3001</p>
            <p className="text-sm text-gray-600">Framework: NestJS</p>
            <p className="text-sm text-gray-600">Status: {apiStatus}</p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Available Endpoints</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• GET / - Hello message</li>
              <li>• GET /api/health - Health check</li>
              <li>• GET /api/database/health - DB health</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setShowSystemModal(true)}
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
          >
            View System Dashboard
          </button>
          <button
            onClick={() => setShowDbWizard(true)}
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
          >
            Database Connection Wizard
          </button>
        </div>
      </div>

      {/* System Dashboard Modal */}
      {showSystemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">System Dashboard</h2>
                <button
                  onClick={() => setShowSystemModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <p className="text-gray-600 mb-8">
                Welcome to your system dashboard
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">System Status</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Check API connection and system health
                  </p>
                  <div className="text-sm text-gray-600">
                    <p>• API Status: {apiStatus}</p>
                    <p>• Server: http://localhost:3001</p>
                    <p>• Framework: NestJS</p>
                  </div>
                </div>
                
                <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">Database Status</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Database connection and health
                  </p>
                  <div className="text-sm text-gray-600">
                    <p>• DB Status: {dbStatus}</p>
                    <p>• Type: PostgreSQL</p>
                    <p>• Host: localhost:5432</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">--</div>
                    <div className="text-sm text-gray-600">Active Users</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">--</div>
                    <div className="text-sm text-gray-600">API Calls</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">--</div>
                    <div className="text-sm text-gray-600">System Health</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Connection Wizard Modal */}
      {showDbWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Database Connection Wizard</h2>
                <button
                  onClick={() => setShowDbWizard(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Step 1: Connection Test</h3>
                  <p className="text-sm text-blue-600 mb-4">
                    Test the database connection to ensure everything is working properly.
                  </p>
                  <button
                    onClick={checkDatabaseConnection}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Test Connection
                  </button>
                </div>

                {dbData && (
                  <div className={`p-6 rounded-lg border ${
                    dbStatus === 'Connected' ? 'bg-green-50 border-green-200' : 
                    dbStatus === 'Disconnected' ? 'bg-red-50 border-red-200' : 
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      dbStatus === 'Connected' ? 'text-green-800' : 
                      dbStatus === 'Disconnected' ? 'text-red-800' : 
                      'text-yellow-800'
                    }`}>Connection Results</h3>
                    <div className="text-left">
                      <p className="text-sm text-gray-700 mb-2">
                        Status: <span className={`font-bold ${
                          dbStatus === 'Connected' ? 'text-green-600' : 
                          dbStatus === 'Disconnected' ? 'text-red-600' : 
                          'text-yellow-600'
                        }`}>
                          {dbStatus}
                        </span>
                      </p>
                      {dbStatus === 'Disconnected' && (
                        <div className="mt-2 p-3 bg-red-100 rounded border border-red-200">
                          <p className="text-sm text-red-700">
                            <strong>Action Required:</strong> {dbData.message}
                          </p>
                        </div>
                      )}
                      <pre className="text-xs mt-2 whitespace-pre-wrap text-gray-700 bg-white p-3 rounded border border-gray-200">
                        {JSON.stringify(dbData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

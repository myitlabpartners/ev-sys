// API Configuration
export const API_CONFIG = {
  // Update this to your Coolify backend URL
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://nseta5bgi39ei6vhub8fk2qw.158.101.4.22.sslip.io/',
  
  // API Endpoints
  ENDPOINTS: {
    HEALTH: '/api/health',
    DATABASE_HEALTH: '/api/database/health',
  }
}

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

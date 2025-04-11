// API configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8005';
export const API_ENDPOINTS = {
    analyze: `${API_BASE_URL}/api/analyze`,
}; 
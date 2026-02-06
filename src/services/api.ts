import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export interface PredictionRequest {
  models: string[];
  data: number[];
}

export interface PredictionResponse {
  input_data: number[];
  predictions: Record<string, number>;
}

export const api = {
  // Check backend health
  checkHealth: async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  },

  // Get predictions from Flask API
  getPrediction: async (models: string[], data: number[]) => {
    const response = await axios.post<PredictionResponse>(`${API_BASE_URL}/predict`, {
      models,
      data
    });
    return response.data;
  },

  // Open-Meteo Geocoding API
  searchCity: async (cityName: string) => {
    const response = await axios.get(`https://geocoding-api.open-meteo.com/v1/search`, {
      params: {
        name: cityName,
        count: 1,
        language: 'en',
        format: 'json'
      }
    });
    return response.data.results?.[0] || null;
  },

  // Open-Meteo Historical Weather API
  getHistoricalWeather: async (lat: number, lon: number) => {
    // Get past 15 days to ensure we have 14 full days of previous data
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14); // 14 days ago

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const response = await axios.get(`https://archive-api.open-meteo.com/v1/archive`, {
      params: {
        latitude: lat,
        longitude: lon,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        daily: 'temperature_2m_min',
        timezone: 'auto'
      }
    });

    return response.data;
  }
};

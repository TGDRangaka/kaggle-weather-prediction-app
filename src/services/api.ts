
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export interface PredictionRequest {
  models: string[];
  window: number[][]; // 14x5 matrix
}

export interface PredictionResult {
  value: number;
  unit: string;
}

export interface PredictionResponse {
  predictions: Record<string, PredictionResult>;
  errors?: Record<string, string>;
  meta: {
    input_shape: { rows: number; cols: number };
    timestamp: string;
  };
}

export const api = {
  // Check backend health
  checkHealth: async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  },

  // Get predictions from Flask API
  getPrediction: async (models: string[], windowData: number[][]) => {
    try {
      const response = await axios.post<PredictionResponse>(`${API_BASE_URL}/predict`, {
        models,
        window: windowData
      });
      return response.data;
    } catch (error: any) {
      // Enhance error object
      if (error.response && error.response.data) {
        throw new Error(error.response.data.error || "Server error");
      }
      throw error;
    }
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
    // Get past 14 days (excluding today usually, or including? Prompt says "last 14 days")
    // Let's take yesterday as the last day to ensure data availability
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14); // 14 days before yesterday

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const response = await axios.get(`https://archive-api.open-meteo.com/v1/archive`, {
      params: {
        latitude: lat,
        longitude: lon,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        daily: [
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_sum',
          'snowfall_sum'
        ].join(','),
        timezone: 'auto',
        temperature_unit: 'fahrenheit',
        precipitation_unit: 'inch'
      }
    });

    return response.data;
  }
};

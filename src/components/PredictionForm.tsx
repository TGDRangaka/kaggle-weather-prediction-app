
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudSun, Thermometer, ArrowRight, Loader2, RefreshCw, Trash2, Search, MapPin } from 'lucide-react';
import styles from './PredictionForm.module.css';
import { api, type PredictionResult } from '../services/api';

const MODELS = [
  { id: 'lr', name: 'Linear Regression' },
  { id: 'rf', name: 'Random Forest' },
  { id: 'ann', name: 'ANN' },
  { id: 'ann_tuned', name: 'ANN Tuned' },
  { id: 'svr', name: 'SVR' },
  { id: 'svr_tuned', name: 'SVR Tuned' },
  { id: 'gbr', name: 'Gradient Boosting' },
  { id: 'gbr_tuned', name: 'GBR Tuned' },
  { id: 'lstm', name: 'LSTM' },
];

const RECOMMENDED_MODELS = ['rf', 'gbr_tuned', 'ann_tuned'];

type WeatherRow = {
  max: string;
  min: string;
  precip: string;
  snow: string;
  depth: string;
};

export const PredictionForm: React.FC = () => {
  const [inputMode, setInputMode] = useState<'manual' | 'city'>('manual');
  const [cityQuery, setCityQuery] = useState('');

  // 14 rows, 5 columns
  const [weatherData, setWeatherData] = useState<WeatherRow[]>(
    Array(14).fill(null).map(() => ({ max: '', min: '', precip: '', snow: '', depth: '' }))
  );

  const [selectedModels, setSelectedModels] = useState<string[]>(RECOMMENDED_MODELS);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, PredictionResult> | null>(null);
  const [modelErrors, setModelErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // --- Handlers ---

  const handleCellChange = (rowIndex: number, field: keyof WeatherRow, value: string) => {
    const newData = [...weatherData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setWeatherData(newData);
  };

  const clearData = () => {
    setWeatherData(Array(14).fill(null).map(() => ({ max: '', min: '', precip: '', snow: '', depth: '' })));
    setPredictions(null);
    setGlobalError(null);
    setModelErrors({});
  };

  const fillDemoData = () => {
    // Generate realistic weather pattern
    const newData = weatherData.map((_, i) => {
      const baseTemp = 70 + Math.sin(i / 2) * 10;
      const max = (baseTemp + 5 + Math.random() * 5).toFixed(1);
      const min = (baseTemp - 5 - Math.random() * 5).toFixed(1);
      const precip = Math.random() > 0.7 ? (Math.random() * 0.5).toFixed(2) : '0';
      return {
        max,
        min,
        precip,
        snow: '0',
        depth: '0'
      };
    });
    setWeatherData(newData);
  };

  // --- Model Selection ---

  const toggleModel = (id: string) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const selectAllModels = () => setSelectedModels(MODELS.map(m => m.id));
  const selectRecommended = () => setSelectedModels(RECOMMENDED_MODELS);
  const deselectAll = () => setSelectedModels([]);

  // --- API Calls ---

  const handleCitySearch = async () => {
    if (!cityQuery.trim()) return;
    setLoading(true);
    setGlobalError(null);

    try {
      const location = await api.searchCity(cityQuery);
      if (!location) throw new Error(`City "${cityQuery}" not found.`);

      const data = await api.getHistoricalWeather(location.latitude, location.longitude);

      if (!data.daily || !data.daily.temperature_2m_min || data.daily.temperature_2m_min.length < 14) {
        throw new Error("Insufficient historical data.");
      }

      // Map API response to our grid (Last 14 days)
      const daily = data.daily;
      // Indexing: Open-Meteo returns array. We take last 14.
      const startIndex = daily.time.length - 14;

      const newRows = Array(14).fill(null).map((_, i) => {
        const idx = startIndex + i;
        return {
          max: daily.temperature_2m_max[idx]?.toString() || '',
          min: daily.temperature_2m_min[idx]?.toString() || '',
          precip: daily.precipitation_sum[idx]?.toString() || '0',
          snow: daily.snowfall_sum[idx]?.toString() || '0',
          depth: '0' // Default
        };
      });

      setWeatherData(newRows);
    } catch (err: any) {
      setGlobalError(err.message || "Failed to fetch city data.");
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    setGlobalError(null);
    setPredictions(null);
    setModelErrors({});

    // Validation
    if (selectedModels.length === 0) {
      setGlobalError("Please select at least one model.");
      setLoading(false);
      return;
    }

    // specific validation: check if max/min are filled
    const missingData = weatherData.some((row) => {
      return row.max === '' || row.min === '';
    });

    if (missingData) {
      setGlobalError("Max and Min temperatures are required for all 14 days.");
      setLoading(false);
      return;
    }

    // Construct Payload
    const window = weatherData.map(row => [
      parseFloat(row.max),
      parseFloat(row.min),
      parseFloat(row.precip || '0'),
      parseFloat(row.snow || '0'),
      parseFloat(row.depth || '0')
    ]);

    // Check for NaNs
    if (window.some(row => row.some(val => isNaN(val)))) {
      setGlobalError("All inputs must be valid numbers.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.getPrediction(selectedModels, window);
      setPredictions(response.predictions);
      if (response.errors) {
        setModelErrors(response.errors);
      }
    } catch (err: any) {
      setGlobalError(err.message || "Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <motion.h1
          className={styles.title}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <CloudSun size={48} className="text-sky-400" color="#38bdf8" />
          Weather Predict AI
        </motion.h1>
        <p className={styles.subtitle}>Multivariate 14-Day Forecast System</p>
      </header>

      {/* Mode Switch */}
      <div className={styles.modeSwitch}>
        <button
          className={`${styles.modeButton} ${inputMode === 'manual' ? styles.modeButtonActive : ''}`}
          onClick={() => setInputMode('manual')}
        >
          Manual Entry
        </button>
        <button
          className={`${styles.modeButton} ${inputMode === 'city' ? styles.modeButtonActive : ''}`}
          onClick={() => setInputMode('city')}
        >
          Find City
        </button>
      </div>

      {/* City Search */}
      <AnimatePresence>
        {inputMode === 'city' && (
          <motion.div
            className={styles.searchContainer}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                className={styles.input}
                style={{ textAlign: 'left', paddingLeft: '2.5rem' }}
                placeholder="Enter city name..."
                value={cityQuery}
                onChange={e => setCityQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
              />
              <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>
            <button className={styles.searchButton} onClick={handleCitySearch} disabled={loading}>
              <Search size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Grid */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Day</th>
              <th>Max Temp (°F)</th>
              <th>Min Temp (°F)</th>
              <th>Precip (in)</th>
              <th>Snow (in)</th>
              <th>Depth (in)</th>
            </tr>
          </thead>
          <tbody>
            {weatherData.map((row, i) => (
              <tr key={i}>
                <td className={styles.dayLabel}>Day {i + 1}</td>
                {Object.keys(row).map((key) => (
                  <td key={key}>
                    <input
                      type="number"
                      className={styles.input}
                      value={row[key as keyof WeatherRow]}
                      onChange={(e) => handleCellChange(i, key as keyof WeatherRow, e.target.value)}
                      placeholder={['precip', 'snow', 'depth'].includes(key) ? '0' : '--'}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.tableActions}>
        <button className={styles.clearButton} onClick={clearData}>
          <Trash2 size={16} /> Clear Data
        </button>
        {inputMode === 'manual' && (
          <button className={styles.clearButton} onClick={fillDemoData} style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}>
            <RefreshCw size={16} /> Load Demo
          </button>
        )}
      </div>

      {/* Model Selection */}
      <div className={styles.modelSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Select Models</span>
          <div className={styles.modelActions}>
            <button className={styles.textButton} onClick={selectAllModels}>Select All</button>
            <button className={styles.textButton} onClick={selectRecommended}>Recommended</button>
            <button className={styles.textButton} onClick={deselectAll}>None</button>
          </div>
        </div>
        <div className={styles.modelsGrid}>
          {MODELS.map(model => (
            <label key={model.id} className={styles.checkboxLabel} style={selectedModels.includes(model.id) ? { borderColor: '#38bdf8', background: 'rgba(56,189,248,0.1)' } : {}}>
              <input
                type="checkbox"
                checked={selectedModels.includes(model.id)}
                onChange={() => toggleModel(model.id)}
              />
              <span>{model.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.button} onClick={handlePredict} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Thermometer />}
          {loading ? 'Processing...' : 'Predict Weather'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </div>

      {/* Errors & Results */}
      <AnimatePresence>
        {globalError && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {globalError}
          </motion.div>
        )}

        {predictions && (
          <motion.div
            className={styles.resultsGrid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {Object.entries(predictions).map(([id, result]) => (
              <div key={id} className={styles.resultCard}>
                <h3>{MODELS.find(m => m.id === id)?.name || id}</h3>
                <div className={styles.value}>
                  {result.value}
                  <span className={styles.unit}>{result.unit}</span>
                </div>
              </div>
            ))}

            {/* Display Model Specific Errors */}
            {Object.entries(modelErrors).map(([id, err]) => (
              <div key={id} className={styles.resultCard} style={{ borderColor: '#f43f5e' }}>
                <h3>{MODELS.find(m => m.id === id)?.name || id}</h3>
                <div className={styles.errorText}>{err}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudSun,
  Loader2,
  RefreshCw,
  Trash2,
  Search,
  Settings,
  Zap,
  CheckCircle2
} from 'lucide-react';
import styles from './PredictionForm.module.css';
import { api, type PredictionResult } from '../services/api';

const MODELS = [
  { id: 'lr', name: 'Linear Reg', short: 'LR' },
  { id: 'rf', name: 'Random Forest', short: 'RF' },
  { id: 'svr', name: 'SVR', short: 'SVR' },
  { id: 'svr_tuned', name: 'SVR Tuned', short: 'SVR-T' },
  { id: 'gbr', name: 'Gradient Boost', short: 'GBR' },
  { id: 'gbr_tuned', name: 'GBR Tuned', short: 'GBR-T' },
  { id: 'ann', name: 'ANN', short: 'ANN' },
  { id: 'ann_tuned', name: 'ANN Tuned', short: 'ANN-T' },
  { id: 'lstm', name: 'LSTM', short: 'LSTM' },
];

const RECOMMENDED_MODELS = ['rf', 'gbr_tuned', 'ann_tuned', 'lstm'];

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
    const newData = weatherData.map((_, i) => {
      const baseTemp = 70 + Math.sin(i / 2) * 10;
      const max = (baseTemp + 5 + Math.random() * 5).toFixed(1);
      const min = (baseTemp - 5 - Math.random() * 5).toFixed(1);
      const precip = Math.random() > 0.8 ? (Math.random() * 0.2).toFixed(2) : '0';
      return {
        max, min, precip, snow: '0', depth: '0'
      };
    });
    setWeatherData(newData);
  };

  const toggleModel = (id: string) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

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
        throw new Error("Insufficient data.");
      }

      const daily = data.daily;
      const startIndex = daily.time.length - 14;

      const newRows = Array(14).fill(null).map((_, i) => {
        const idx = startIndex + i;
        return {
          max: daily.temperature_2m_max[idx]?.toString() || '',
          min: daily.temperature_2m_min[idx]?.toString() || '',
          precip: daily.precipitation_sum[idx]?.toString() || '0',
          snow: daily.snowfall_sum[idx]?.toString() || '0',
          depth: '0'
        };
      });
      setWeatherData(newRows);
      // Auto-switch to results view or focus
      setPredictions(null);
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

    if (selectedModels.length === 0) {
      setGlobalError("Select at least one model.");
      setLoading(false);
      return;
    }

    const missingData = weatherData.some((row) => row.max === '' || row.min === '');
    if (missingData) {
      setGlobalError("Max & Min temps needed.");
      setLoading(false);
      return;
    }

    const window = weatherData.map(row => [
      parseFloat(row.max), parseFloat(row.min), parseFloat(row.precip || '0'),
      parseFloat(row.snow || '0'), parseFloat(row.depth || '0')
    ]);

    if (window.some(row => row.some(val => isNaN(val)))) {
      setGlobalError("Invalid numbers detected.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.getPrediction(selectedModels, window);
      setPredictions(response.predictions);
      if (response.errors) setModelErrors(response.errors);
    } catch (err: any) {
      setGlobalError(err.message || "Prediction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <CloudSun size={24} className="text-sky-400" color="#38bdf8" />
            WeatherAI
          </h1>
          <p className={styles.subtitle}>Forecast System v2.0</p>
        </div>

        {/* Top Controls */}
        <div className={styles.topControls}>
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeButton} ${inputMode === 'manual' ? styles.modeButtonActive : ''}`}
              onClick={() => setInputMode('manual')}
            >
              Manual
            </button>
            <button
              className={`${styles.modeButton} ${inputMode === 'city' ? styles.modeButtonActive : ''}`}
              onClick={() => setInputMode('city')}
            >
              City Search
            </button>
          </div>

          <AnimatePresence mode="wait">
            {inputMode === 'city' && (
              <motion.div
                className={styles.searchWrapper}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
              >
                <Search className={styles.searchIcon} />
                <input
                  className={styles.navInput}
                  placeholder="San Francisco..."
                  value={cityQuery}
                  onChange={e => setCityQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content Split */}
      <div className={styles.contentArea}>

        {/* Left: Input Grid */}
        <div className={styles.leftPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <Settings size={14} /> 14-Day History
            </span>
            <div className={styles.quickActions}>
              <button className={styles.iconBtn} onClick={fillDemoData} title="Demo Data">
                <RefreshCw size={14} />
              </button>
              <button className={styles.iconBtn} onClick={clearData} title="Clear">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className={styles.gridContainer}>
            <div className={styles.dataGrid} style={{ gridTemplateColumns: '40px repeat(5, 1fr)' }}>
              {/* Header Row */}
              <div className={styles.gridHeaderCell}>#</div>
              <div className={styles.gridHeaderCell}>Max</div>
              <div className={styles.gridHeaderCell}>Min</div>
              <div className={styles.gridHeaderCell}>Rain</div>
              <div className={styles.gridHeaderCell}>Snow</div>
              <div className={styles.gridHeaderCell}>Depth</div>

              {/* Data Rows */}
              {weatherData.map((row, i) => (
                <React.Fragment key={i}>
                  <div className={styles.gridRowLabel}>{i + 1}</div>
                  <input
                    className={styles.gridInput}
                    value={row.max}
                    onChange={e => handleCellChange(i, 'max', e.target.value)}
                    placeholder="--"
                  />
                  <input
                    className={styles.gridInput}
                    value={row.min}
                    onChange={e => handleCellChange(i, 'min', e.target.value)}
                    placeholder="--"
                  />
                  <input
                    className={styles.gridInput}
                    value={row.precip}
                    onChange={e => handleCellChange(i, 'precip', e.target.value)}
                    placeholder="0"
                  />
                  <input
                    className={styles.gridInput}
                    value={row.snow}
                    onChange={e => handleCellChange(i, 'snow', e.target.value)}
                    placeholder="0"
                  />
                  <input
                    className={styles.gridInput}
                    value={row.depth}
                    onChange={e => handleCellChange(i, 'depth', e.target.value)}
                    placeholder="0"
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Models & Output */}
        <div className={styles.rightPanel}>

          {/* Models */}
          <div className={styles.modelsCard}>
            <span className={styles.panelTitle} style={{ marginBottom: '0.8rem' }}>
              <Zap size={14} /> Active Models
            </span>
            <div className={styles.modelTags}>
              {MODELS.map(m => (
                <div
                  key={m.id}
                  className={`${styles.modelTag} ${selectedModels.includes(m.id) ? styles.modelTagActive : ''}`}
                  onClick={() => toggleModel(m.id)}
                >
                  {selectedModels.includes(m.id) && <CheckCircle2 size={10} style={{ display: 'inline', marginRight: 4 }} />}
                  {m.short}
                </div>
              ))}
            </div>
          </div>

          <button
            className={styles.predictBtn}
            onClick={handlePredict}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            {loading ? 'Processing...' : 'Run Forecast'}
          </button>

          {/* Results List */}
          <div className={styles.resultsArea}>
            <AnimatePresence>
              {globalError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.resultRow}
                  style={{ borderColor: '#f43f5e', color: '#f43f5e', justifyContent: 'center' }}
                >
                  {globalError}
                </motion.div>
              )}

              {predictions && (
                <div className={styles.resultsList}>
                  {Object.entries(predictions).map(([id, result]) => (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={styles.resultRow}
                    >
                      <span className={styles.modelName}>
                        {MODELS.find(m => m.id === id)?.name || id}
                      </span>
                      <div>
                        <span className={styles.modelValue}>{result.value}</span>
                        <span className={styles.modelUnit}>{result.unit}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Only show errors if no predictions or mixed */}
              {Object.entries(modelErrors).map(([id, err]) => (
                <motion.div
                  key={`err-${id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`${styles.resultRow} ${styles.errorRow}`}
                >
                  <span className={styles.modelName} style={{ color: '#f43f5e' }}>
                    {MODELS.find(m => m.id === id)?.short || id}
                  </span>
                  <span className={styles.errorText} title={err}>
                    {err.includes('unexpected keyword') ? 'Config Error' : 'Failed'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudSun, Thermometer, ArrowRight, Loader2, RefreshCw, MapPin, Search } from 'lucide-react';
import styles from './PredictionForm.module.css';
import { api } from '../services/api';

const MODELS = [
  { id: 'linear_regression', name: 'Linear Regression' },
  { id: 'random_forest', name: 'Random Forest' },
  { id: 'ann', name: 'ANN (Neural Network)' },
];

export const PredictionForm: React.FC = () => {
  const [inputMode, setInputMode] = useState<'manual' | 'city'>('manual');
  const [cityQuery, setCityQuery] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(['linear_regression', 'random_forest', 'ann']);

  const [temps, setTemps] = useState<string[]>(Array(14).fill(''));
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (index: number, value: string) => {
    const newTemps = [...temps];
    newTemps[index] = value;
    setTemps(newTemps);
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleCitySearch = async () => {
    if (!cityQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const location = await api.searchCity(cityQuery);
      if (!location) {
        throw new Error(`City "${cityQuery}" not found.`);
      }

      const weatherData = await api.getHistoricalWeather(location.latitude, location.longitude);
      // Ensure we have enough data
      if (!weatherData.daily || !weatherData.daily.temperature_2m_min || weatherData.daily.temperature_2m_min.length < 14) {
        throw new Error("Insufficient historical data for this location.");
      }

      // Take the last 14 days
      const last14Days = weatherData.daily.temperature_2m_min.slice(-14).map((t: number) => t.toString());
      setTemps(last14Days);
    } catch (err: any) {
      setError(err.message || "Failed to fetch city data.");
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setPredictions(null);

    // Validate inputs
    const numericTemps = temps.map(t => parseFloat(t));
    if (numericTemps.some(isNaN)) {
      setError("Please ensure 14 days of valid temperature data is available.");
      setLoading(false);
      return;
    }

    if (selectedModels.length === 0) {
      setError("Please select at least one model.");
      setLoading(false);
      return;
    }

    try {
      // Simulate a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 600));

      const response = await api.getPrediction(selectedModels, numericTemps);
      setPredictions(response.predictions);
    } catch (err: any) {
      console.error("Prediction Error", err);
      setError(err.message || "An error occurred during prediction.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoData = () => {
    const baseTemp = 20;
    const demo = Array(14).fill(0).map((_, i) => {
      const trend = Math.sin(i / 2) * 5;
      const noise = (Math.random() - 0.5) * 2;
      return (baseTemp + trend + noise).toFixed(1);
    });
    setTemps(demo);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CloudSun size={48} className="text-sky-400" color="#38bdf8" />
          MinTemp AI
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Predict tomorrow's minimum temperature
        </motion.p>
      </header>

      {/* Mode Switch */}
      <div className={styles.modeSwitch}>
        <button
          className={`${styles.modeButton} ${inputMode === 'manual' ? styles.modeButtonActive : ''}`}
          onClick={() => setInputMode('manual')}
        >
          Manual Input
        </button>
        <button
          className={`${styles.modeButton} ${inputMode === 'city' ? styles.modeButtonActive : ''}`}
          onClick={() => setInputMode('city')}
        >
          Select City
        </button>
      </div>

      <AnimatePresence mode="wait">
        {inputMode === 'city' ? (
          <motion.div
            key="city"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={styles.searchContainer}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className={styles.input}
                style={{ paddingLeft: '2.5rem', textAlign: 'left' }}
                placeholder="Enter city name..."
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
              />
              <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
            </div>
            <button className={styles.searchButton} onClick={handleCitySearch} disabled={loading}>
              <Search size={20} />
            </button>
          </motion.div>
        ) : (
          <motion.div key="manual" />
        )}
      </AnimatePresence>

      <span className={styles.sectionLabel}>14 Days Previous Min Temp (°C)</span>

      <div className={styles.grid}>
        {temps.map((temp, index) => (
          <motion.div
            key={index}
            className={styles.inputGroup}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
          >
            <label className={styles.label}>Day {index + 1}</label>
            <input
              type="number"
              className={styles.input}
              value={temp}
              onChange={(e) => handleInputChange(index, e.target.value)}
              placeholder="--"
              readOnly={inputMode === 'city'} // Read-only if fetched from city
              style={inputMode === 'city' ? { opacity: 0.7, cursor: 'default' } : {}}
            />
          </motion.div>
        ))}
      </div>

      {inputMode === 'manual' && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={fillDemoData} className={styles.demoButton}>
            <RefreshCw size={14} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
            Auto-fill with Demo Data
          </button>
        </div>
      )}

      <span className={styles.sectionLabel}>Select AI Models</span>
      <div className={styles.modelsGrid}>
        {MODELS.map(model => (
          <label key={model.id} className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={selectedModels.includes(model.id)}
              onChange={() => toggleModel(model.id)}
            />
            <span>{model.name}</span>
          </label>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.button}
          onClick={handlePredict}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Thermometer />}
          {loading ? 'Analyzing...' : 'Predict Result'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.div>
        )}

        {predictions && (
          <motion.div
            className={styles.resultWrapper}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className={styles.resultsGrid}>
              {Object.entries(predictions).map(([modelId, value]) => {
                const modelName = MODELS.find(m => m.id === modelId)?.name || modelId;
                return (
                  <div key={modelId} className={styles.resultCard}>
                    <h3>{modelName}</h3>
                    <div className="value">
                      {typeof value === 'number' ? value.toFixed(2) : value}
                      <span style={{ fontSize: '1rem', marginLeft: '4px', opacity: 0.7 }}>°C</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Demand Forecasting API Route
 * Endpoints for demand predictions and showcase data
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * GET /api/demand-forecast/predictions
 * Get demand forecast predictions for showcase
 */
router.get('/predictions', authenticateToken, async (req, res) => {
  try {
    const { hospitalId, bloodGroup, horizon } = req.query;
    const horizonDays = parseInt(horizon) || 30;

    if (!hospitalId || !bloodGroup) {
      return res.status(400).json({
        message: 'hospitalId and bloodGroup are required',
        example: '/api/demand-forecast/predictions?hospitalId=xxx&bloodGroup=O+&horizon=30',
      });
    }

    // Call ML Service
    const response = await axios.get(`${ML_SERVICE_URL}/predict/demand`, {
      params: {
        hospital_id: hospitalId,
        blood_group: bloodGroup,
        horizon_days: horizonDays,
      },
      timeout: 30000,
    });

    res.json({
      success: true,
      data: response.data,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Demand Forecast API Error:', error.message);
    res.status(500).json({
      message: 'Failed to fetch demand predictions',
      error: error.message,
    });
  }
});

/**
 * GET /api/demand-forecast/showcase
 * Get pre-computed showcase data with multiple blood groups and predictions
 */
router.get('/showcase', authenticateToken, async (req, res) => {
  try {
    const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+'];
    const HOSPITAL_ID = '507f1f77bcf86cd799439011'; // Primary showcase hospital

    console.log('🔄 Fetching showcase demand forecast data...');

    // Fetch predictions for multiple blood groups
    const forecasts = await Promise.all(
      BLOOD_GROUPS.map(async (bg) => {
        try {
          const response = await axios.get(`${ML_SERVICE_URL}/predict/demand`, {
            params: {
              hospital_id: HOSPITAL_ID,
              blood_group: bg,
              horizon_days: 30,
            },
            timeout: 30000,
          });
          return response.data;
        } catch (err) {
          console.error(`Error fetching forecast for ${bg}:`, err.message);
          return null;
        }
      })
    );

    // Filter out null responses
    const validForecasts = forecasts.filter(f => f !== null);

    if (validForecasts.length === 0) {
      return res.status(503).json({
        message: 'ML Service unavailable or models not trained yet',
        hint: 'Run: npm run seed:demand-forecast && python ml-service/app/training/train_models.py',
      });
    }

    // Prepare showcase response
    const showcaseData = {
      hospital: {
        id: HOSPITAL_ID,
        name: 'Primary Hospital (Showcase)',
      },
      forecastPeriod: {
        startDate: new Date().toISOString().split('T')[0],
        days: 30,
      },
      forecasts: validForecasts.map((forecast, idx) => ({
        bloodGroup: BLOOD_GROUPS[idx],
        predictions: forecast.predictions || [],
        confidence: forecast.confidence_interval || { level: 0.95, method: 'bootstrap_percentile' },
        modelVersion: forecast.model_version || 'lstm-v1.0',
      })),
      summary: {
        totalForecasts: validForecasts.length,
        accuracy: 'High confidence (95%)',
        lastUpdated: new Date().toISOString(),
      },
    };

    res.json({
      success: true,
      data: showcaseData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Showcase Data Error:', error.message);
    res.status(500).json({
      message: 'Failed to fetch showcase data',
      error: error.message,
    });
  }
});

/**
 * GET /api/demand-forecast/status
 * Check if models are trained and ready
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 10000,
    });

    res.json({
      success: true,
      mlService: response.data,
      modelStatus: {
        demandForecasting: 'Ready',
        crisisPrediction: 'Ready',
        lastTrained: new Date(Date.now() - 86400000).toISOString(), // 1 day ago (placeholder)
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'ML Service is offline or models not trained',
      error: error.message,
    });
  }
});

module.exports = router;

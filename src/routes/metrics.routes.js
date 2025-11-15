const express = require('express');
const router = express.Router();
const { register } = require('../middleware/metrics');
const { updateBusinessMetrics } = require('../services/metricsUpdater');

// Endpoint para Prometheus (formato texto)
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// Endpoint para ver métricas en JSON (desarrollo/debug)
router.get('/metrics/json', async (req, res) => {
  try {
    const metrics = await register.getMetricsAsJSON();
    res.json({
      timestamp: new Date().toISOString(),
      metrics: metrics
    });
  } catch (error) {
    console.error('Error obteniendo métricas JSON:', error);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// Endpoint para forzar actualización de métricas (desarrollo)
router.post('/metrics/refresh', async (req, res) => {
  try {
    await updateBusinessMetrics();
    res.json({ 
      message: 'Métricas actualizadas exitosamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error actualizando métricas:', error);
    res.status(500).json({ error: 'Error actualizando métricas' });
  }
});

// Endpoint de health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

module.exports = router;
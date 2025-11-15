const promClient = require('prom-client');

// Crear registro de métricas
const register = new promClient.Registry();

// Agregar métricas por defecto (CPU, memoria, etc.)
promClient.collectDefaultMetrics({ 
  register,
  prefix: 'taller_',
  timeout: 5000 
});

// ========================================
// MÉTRICAS PERSONALIZADAS
// ========================================

// 1. Contador de solicitudes HTTP
const httpRequestCounter = new promClient.Counter({
  name: 'taller_http_requests_total',
  help: 'Total de solicitudes HTTP recibidas',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// 2. Histograma de duración de solicitudes
const httpRequestDuration = new promClient.Histogram({
  name: 'taller_http_request_duration_seconds',
  help: 'Duración de las solicitudes HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// 3. Gauge para conexiones activas
const activeConnections = new promClient.Gauge({
  name: 'taller_active_connections',
  help: 'Número de conexiones HTTP activas',
  registers: [register]
});

// 4. Contador de errores
const errorCounter = new promClient.Counter({
  name: 'taller_errors_total',
  help: 'Total de errores en la aplicación',
  labelNames: ['type', 'route'],
  registers: [register]
});

// 5. Gauge para órdenes pendientes
const pendingOrdersGauge = new promClient.Gauge({
  name: 'taller_pending_orders',
  help: 'Número de órdenes de servicio pendientes',
  registers: [register]
});

// 6. Gauge para órdenes en proceso
const inProgressOrdersGauge = new promClient.Gauge({
  name: 'taller_in_progress_orders',
  help: 'Número de órdenes de servicio en proceso',
  registers: [register]
});

// 7. Contador de clientes registrados
const clientsCounter = new promClient.Gauge({
  name: 'taller_total_clients',
  help: 'Total de clientes registrados',
  registers: [register]
});

// 8. Contador de vehículos registrados
const vehiclesCounter = new promClient.Gauge({
  name: 'taller_total_vehicles',
  help: 'Total de vehículos registrados',
  registers: [register]
});

// 9. Contador de empleados activos
const activeEmployeesCounter = new promClient.Gauge({
  name: 'taller_active_employees',
  help: 'Número de empleados activos',
  registers: [register]
});

// 10. Gauge para ingresos del día
const dailyRevenueGauge = new promClient.Gauge({
  name: 'taller_daily_revenue',
  help: 'Ingresos totales del día',
  registers: [register]
});

module.exports = {
  register,
  httpRequestCounter,
  httpRequestDuration,
  activeConnections,
  errorCounter,
  pendingOrdersGauge,
  inProgressOrdersGauge,
  clientsCounter,
  vehiclesCounter,
  activeEmployeesCounter,
  dailyRevenueGauge
};
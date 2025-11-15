const { PrismaClient } = require('@prisma/client');
const {
  pendingOrdersGauge,
  inProgressOrdersGauge,
  clientsCounter,
  vehiclesCounter,
  activeEmployeesCounter,
  dailyRevenueGauge
} = require('../middleware/metrics');

const prisma = new PrismaClient();

// Actualizar métricas de negocio cada 30 segundos
const updateBusinessMetrics = async () => {
  try {
    // 1. Contar órdenes pendientes
    const pendingOrders = await prisma.ordenes_servicio.count({
      where: { estado: 'pendiente' }
    });
    pendingOrdersGauge.set(pendingOrders);

    // 2. Contar órdenes en proceso
    const inProgressOrders = await prisma.ordenes_servicio.count({
      where: { estado: 'en_proceso' }
    });
    inProgressOrdersGauge.set(inProgressOrders);

    // 3. Contar total de clientes
    const totalClients = await prisma.clientes.count();
    clientsCounter.set(totalClients);

    // 4. Contar total de vehículos
    const totalVehicles = await prisma.vehiculos.count();
    vehiclesCounter.set(totalVehicles);

    // 5. Contar empleados activos
    const activeEmployees = await prisma.empleados.count({
      where: { activo: true }
    });
    activeEmployeesCounter.set(activeEmployees);

    // 6. Calcular ingresos del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyRevenue = await prisma.facturas.aggregate({
      where: {
        fecha: {
          gte: today
        }
      },
      _sum: {
        total: true
      }
    });
    dailyRevenueGauge.set(Number(dailyRevenue._sum.total || 0));

    console.log('✅ Métricas de negocio actualizadas');
  } catch (error) {
    console.error('❌ Error actualizando métricas:', error);
  }
};

// Iniciar actualización periódica
const startMetricsUpdater = () => {
  // Actualizar inmediatamente
  updateBusinessMetrics();
  
  // Actualizar cada 30 segundos
  setInterval(updateBusinessMetrics, 30000);
  
  console.log('📊 Sistema de métricas iniciado (actualización cada 30s)');
};

module.exports = { startMetricsUpdater, updateBusinessMetrics };
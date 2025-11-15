const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getOrdenesRecientes,
    getClientesRecientes,
    getActividadReciente,
    getGraficaVentasMensuales,
    getDistribucionOrdenes,
    getServiciosMasVendidosMes,
    getComparacionMensual
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/ordenes-recientes', protect, getOrdenesRecientes);
router.get('/clientes-recientes', protect, getClientesRecientes);
router.get('/actividad-reciente', protect, getActividadReciente);
router.get('/ventas-mensuales', protect, getGraficaVentasMensuales);
router.get('/distribucion-ordenes', protect, getDistribucionOrdenes);
router.get('/servicios-mas-vendidos', protect, getServiciosMasVendidosMes);
router.get('/comparacion-mensual', protect, getComparacionMensual);

module.exports = router;
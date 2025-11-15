const express = require('express');
const router = express.Router();
const {
    getFacturas,
    getFacturaById,
    createFactura,
    updateFactura,
    deleteFactura,
    getResumenVentas,
    getVentasPorPeriodo,
    getFacturaByOrden
} = require('../controllers/facturasController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getFacturas);
router.get('/resumen', protect, getResumenVentas);
router.get('/periodo', protect, getVentasPorPeriodo);
router.get('/orden/:id_orden', protect, getFacturaByOrden);
router.get('/:id', protect, getFacturaById);
router.post('/', protect, createFactura);
router.put('/:id', protect, updateFactura);
router.delete('/:id', protect, deleteFactura);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
    getOrdenes,
    getOrdenById,
    createOrden,
    updateOrden,
    addServicioToOrden,
    deleteOrden,
    getOrdenesStats
} = require('../controllers/ordenesController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getOrdenes);
router.get('/stats', protect, getOrdenesStats);
router.get('/:id', protect, getOrdenById);
router.post('/', protect, createOrden);
router.put('/:id', protect, updateOrden);
router.post('/:id/servicios', protect, addServicioToOrden);
router.delete('/:id', protect, deleteOrden);

module.exports = router;
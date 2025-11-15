const express = require('express');
const router = express.Router();
const {
    getServicios,
    getServicioById,
    createServicio,
    updateServicio,
    toggleServicio,
    deleteServicio,
    getServiciosPopulares,
    getIngresosPorServicio,
    searchServicios
} = require('../controllers/serviciosController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getServicios);
router.get('/search', protect, searchServicios);
router.get('/populares', protect, getServiciosPopulares);
router.get('/ingresos', protect, getIngresosPorServicio);
router.get('/:id', protect, getServicioById);
router.post('/', protect, createServicio);
router.put('/:id', protect, updateServicio);
router.patch('/:id/toggle', protect, toggleServicio);
router.delete('/:id', protect, deleteServicio);

module.exports = router;
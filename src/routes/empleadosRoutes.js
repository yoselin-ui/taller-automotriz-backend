const express = require('express');
const router = express.Router();
const {
    getEmpleados,
    getEmpleadoById,
    createEmpleado,
    updateEmpleado,
    toggleEmpleado,
    deleteEmpleado,
    getEmpleadoStats,
    getEmpleadosProductivos,
    searchEmpleados
} = require('../controllers/empleadosController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getEmpleados);
router.get('/search', protect, searchEmpleados);
router.get('/productivos', protect, getEmpleadosProductivos);
router.get('/:id', protect, getEmpleadoById);
router.get('/:id/stats', protect, getEmpleadoStats);
router.post('/', protect, createEmpleado);
router.put('/:id', protect, updateEmpleado);
router.patch('/:id/toggle', protect, toggleEmpleado);
router.delete('/:id', protect, deleteEmpleado);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
    getVehiculos,
    getVehiculoById,
    createVehiculo,
    updateVehiculo,
    deleteVehiculo,
    getVehiculosByCliente,
    searchVehiculos
} = require('../controllers/vehiculosController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getVehiculos);
router.get('/search', protect, searchVehiculos);
router.get('/cliente/:id_cliente', protect, getVehiculosByCliente);
router.get('/:id', protect, getVehiculoById);
router.post('/', protect, createVehiculo);
router.put('/:id', protect, updateVehiculo);
router.delete('/:id', protect, deleteVehiculo);

module.exports = router;
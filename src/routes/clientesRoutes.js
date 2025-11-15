const express = require('express');
const router = express.Router();
const {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
    searchClientes
} = require('../controllers/clientesController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getClientes);
router.get('/search', protect, searchClientes);
router.get('/:id', protect, getClienteById);
router.post('/', protect, createCliente);
router.put('/:id', protect, updateCliente);
router.delete('/:id', protect, deleteCliente);

module.exports = router;
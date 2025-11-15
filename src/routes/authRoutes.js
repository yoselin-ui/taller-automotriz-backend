const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getMe, 
    changePassword 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
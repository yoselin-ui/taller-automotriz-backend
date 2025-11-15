const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const asyncHandler = require('express-async-handler');

// Registrar nuevo usuario (admin puede crear usuarios)
const register = asyncHandler(async (req, res) => {
    const { email, password, nombre, rol } = req.body;

    // Validación básica
    if (!email || !password || !nombre) {
        res.status(400);
        throw new Error('Por favor, proporciona email, contraseña y nombre.');
    }

    // Verificar si el usuario ya existe
    const userExists = await prisma.users.findUnique({ 
        where: { email } 
    });
    
    if (userExists) {
        res.status(400);
        throw new Error('El email ya está registrado.');
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario en la base de datos
    const user = await prisma.users.create({
        data: { 
            email, 
            password: hashedPassword,
            nombre,
            rol: rol || 'empleado'
        }
    });

    // Responder con datos del usuario y token JWT
    res.status(201).json({
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        token: generateToken(user.id)
    });
});

// Login de usuario
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    // Validación
    if (!email || !password) {
        res.status(400);
        throw new Error('Por favor, proporciona email y contraseña.');
    }

    // Buscar usuario por email
    const user = await prisma.users.findUnique({ 
        where: { email } 
    });

    // Verificar usuario y contraseña
    if (user && await bcrypt.compare(password, user.password)) {
        // Verificar si está activo
        if (!user.activo) {
            res.status(403);
            throw new Error('Usuario inactivo. Contacta al administrador.');
        }

        res.json({
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            token: generateToken(user.id)
        });
    } else {
        res.status(401);
        throw new Error('Credenciales inválidas.');
    }
});

// Obtener perfil del usuario autenticado
const getMe = asyncHandler(async (req, res) => {
    const user = await prisma.users.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            nombre: true,
            rol: true,
            activo: true,
            created_at: true
        }
    });

    if (!user) {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }

    res.json(user);
});

// Cambiar contraseña
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error('Proporciona la contraseña actual y la nueva.');
    }

    // Buscar usuario
    const user = await prisma.users.findUnique({
        where: { id: req.user.id }
    });

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        res.status(401);
        throw new Error('Contraseña actual incorrecta.');
    }

    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizar contraseña
    await prisma.users.update({
        where: { id: req.user.id },
        data: { password: hashedPassword }
    });

    res.json({ message: 'Contraseña actualizada exitosamente.' });
});

// Generar token JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

module.exports = { 
    register, 
    login, 
    getMe, 
    changePassword 
};
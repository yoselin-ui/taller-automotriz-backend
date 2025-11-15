const jwt = require('jsonwebtoken');
const prisma = require('../db');

// Middleware de protección de rutas
const protect = async (req, res, next) => {
    let token;

    // Revisamos si existe un header Authorization con Bearer token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraemos el token después de 'Bearer '
            token = req.headers.authorization.split(' ')[1];
            
            // Verificamos y decodificamos el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Buscamos usuario por id del token y lo agregamos a req.user
            req.user = await prisma.users.findUnique({
                where: { id: decoded.id },
                select: { 
                    id: true, 
                    email: true, 
                    nombre: true, 
                    rol: true,
                    activo: true 
                }
            });

            if (!req.user) {
                res.status(401);
                throw new Error('No autorizado, usuario no encontrado.');
            }

            // Verificar si el usuario está activo
            if (!req.user.activo) {
                res.status(403);
                throw new Error('Usuario inactivo. Contacta al administrador.');
            }

            next(); // Continuamos al siguiente middleware/controlador
        } catch (error) {
            console.error('Error en autenticación:', error.message);
            res.status(401);
            next(new Error('No autorizado, el token falló.'));
        }
    }

    if (!token) {
        res.status(401);
        next(new Error('No autorizado, no se proporcionó un token.'));
    }
};

// Middleware para verificar roles específicos
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401);
            return next(new Error('No autorizado.'));
        }

        if (!roles.includes(req.user.rol)) {
            res.status(403);
            return next(new Error(`Rol '${req.user.rol}' no autorizado para esta acción.`));
        }

        next();
    };
};

module.exports = { protect, authorize };
const prisma = require('../db');
const asyncHandler = require('express-async-handler');

// Obtener todos los servicios
const getServicios = asyncHandler(async (req, res) => {
    const { activo } = req.query;

    const where = activo !== undefined ? { activo: activo === 'true' } : {};

    const servicios = await prisma.servicios.findMany({
        where,
        orderBy: { nombre: 'asc' }
    });

    res.json(servicios);
});

// Obtener servicio por ID
const getServicioById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const servicio = await prisma.servicios.findUnique({
        where: { id_servicio: Number(id) },
        include: {
            detalle_orden: {
                include: {
                    orden: {
                        include: {
                            vehiculo: {
                                include: {
                                    cliente: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                take: 10
            }
        }
    });

    if (!servicio) {
        res.status(404);
        throw new Error('Servicio no encontrado');
    }

    res.json(servicio);
});

// Crear nuevo servicio
const createServicio = asyncHandler(async (req, res) => {
    const { nombre, descripcion, precio, tiempo_est } = req.body;

    // Validación
    if (!nombre || !precio) {
        res.status(400);
        throw new Error('Nombre y precio son requeridos');
    }

    if (isNaN(parseFloat(precio)) || parseFloat(precio) <= 0) {
        res.status(400);
        throw new Error('El precio debe ser un número válido mayor a 0');
    }

    // Verificar si el servicio ya existe
    const servicioExists = await prisma.servicios.findFirst({
        where: { 
            nombre: { 
                equals: nombre.trim(),
                mode: 'insensitive'
            } 
        }
    });

    if (servicioExists) {
        res.status(409);
        throw new Error('Ya existe un servicio con ese nombre');
    }

    const servicio = await prisma.servicios.create({
        data: {
            nombre: nombre.trim(),
            descripcion: descripcion?.trim(),
            precio: parseFloat(precio),
            tiempo_est: tiempo_est ? Number(tiempo_est) : null
        }
    });

    res.status(201).json(servicio);
});

// Actualizar servicio
const updateServicio = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, tiempo_est, activo } = req.body;

    const servicioExists = await prisma.servicios.findUnique({
        where: { id_servicio: Number(id) }
    });

    if (!servicioExists) {
        res.status(404);
        throw new Error('Servicio no encontrado');
    }

    // Si se cambia el nombre, verificar que no exista otro con ese nombre
    if (nombre && nombre !== servicioExists.nombre) {
        const nombreExists = await prisma.servicios.findFirst({
            where: {
                nombre: {
                    equals: nombre.trim(),
                    mode: 'insensitive'
                },
                NOT: {
                    id_servicio: Number(id)
                }
            }
        });

        if (nombreExists) {
            res.status(409);
            throw new Error('Ya existe un servicio con ese nombre');
        }
    }

    const servicio = await prisma.servicios.update({
        where: { id_servicio: Number(id) },
        data: {
            nombre: nombre?.trim(),
            descripcion: descripcion?.trim(),
            precio: precio ? parseFloat(precio) : undefined,
            tiempo_est: tiempo_est ? Number(tiempo_est) : undefined,
            activo: activo !== undefined ? Boolean(activo) : undefined
        }
    });

    res.json(servicio);
});

// Desactivar servicio (soft delete)
const toggleServicio = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const servicio = await prisma.servicios.findUnique({
        where: { id_servicio: Number(id) }
    });

    if (!servicio) {
        res.status(404);
        throw new Error('Servicio no encontrado');
    }

    const updated = await prisma.servicios.update({
        where: { id_servicio: Number(id) },
        data: {
            activo: !servicio.activo
        }
    });

    res.json({
        message: `Servicio ${updated.activo ? 'activado' : 'desactivado'} exitosamente`,
        servicio: updated
    });
});

// Eliminar servicio permanentemente
const deleteServicio = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const servicio = await prisma.servicios.findUnique({
        where: { id_servicio: Number(id) },
        include: {
            detalle_orden: true
        }
    });

    if (!servicio) {
        res.status(404);
        throw new Error('Servicio no encontrado');
    }

    // Verificar si tiene órdenes asociadas
    if (servicio.detalle_orden.length > 0) {
        res.status(400);
        throw new Error('No se puede eliminar un servicio con órdenes asociadas. Considere desactivarlo.');
    }

    await prisma.servicios.delete({
        where: { id_servicio: Number(id) }
    });

    res.json({ message: 'Servicio eliminado exitosamente' });
});

// Obtener servicios más solicitados
const getServiciosPopulares = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const servicios = await prisma.detalle_orden.groupBy({
        by: ['id_servicio'],
        _count: {
            id_servicio: true
        },
        _sum: {
            cantidad: true
        },
        orderBy: {
            _count: {
                id_servicio: 'desc'
            }
        },
        take: Number(limit)
    });

    // Obtener información completa de los servicios
    const serviciosIds = servicios.map(s => s.id_servicio);
    const serviciosInfo = await prisma.servicios.findMany({
        where: {
            id_servicio: { in: serviciosIds }
        }
    });

    // Combinar información
    const resultado = servicios.map(s => {
        const info = serviciosInfo.find(si => si.id_servicio === s.id_servicio);
        return {
            ...info,
            total_ordenes: s._count.id_servicio,
            cantidad_total: s._sum.cantidad
        };
    });

    res.json(resultado);
});

// Obtener ingresos por servicio
const getIngresosPorServicio = asyncHandler(async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    let where = {};
    
    if (fecha_inicio && fecha_fin) {
        where.orden = {
            fecha_entrada: {
                gte: new Date(fecha_inicio),
                lte: new Date(fecha_fin)
            }
        };
    }

    const detalles = await prisma.detalle_orden.findMany({
        where,
        include: {
            servicio: true
        }
    });

    // Agrupar por servicio
    const ingresosPorServicio = detalles.reduce((acc, detalle) => {
        const servicioId = detalle.id_servicio;
        if (!acc[servicioId]) {
            acc[servicioId] = {
                servicio: detalle.servicio,
                total_ingresos: 0,
                cantidad_vendida: 0
            };
        }
        acc[servicioId].total_ingresos += parseFloat(detalle.subtotal);
        acc[servicioId].cantidad_vendida += detalle.cantidad;
        return acc;
    }, {});

    // Convertir a array y ordenar por ingresos
    const resultado = Object.values(ingresosPorServicio).sort(
        (a, b) => b.total_ingresos - a.total_ingresos
    );

    res.json(resultado);
});

// Buscar servicios
const searchServicios = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q) {
        res.status(400);
        throw new Error('Proporciona un término de búsqueda');
    }

    const servicios = await prisma.servicios.findMany({
        where: {
            OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { descripcion: { contains: q, mode: 'insensitive' } }
            ]
        }
    });

    res.json(servicios);
});

module.exports = {
    getServicios,
    getServicioById,
    createServicio,
    updateServicio,
    toggleServicio,
    deleteServicio,
    getServiciosPopulares,
    getIngresosPorServicio,
    searchServicios
};
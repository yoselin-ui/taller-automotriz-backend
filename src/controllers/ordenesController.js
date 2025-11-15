const prisma = require('../db');
const asyncHandler = require('express-async-handler');

// Obtener todas las órdenes
const getOrdenes = asyncHandler(async (req, res) => {
    const { estado } = req.query;

    const where = estado ? { estado } : {};

    const ordenes = await prisma.ordenes_servicio.findMany({
        where,
        include: {
            vehiculo: {
                include: {
                    cliente: true
                }
            },
            empleado: true,
            detalle_orden: {
                include: {
                    servicio: true
                }
            }
        },
        orderBy: { fecha_entrada: 'desc' }
    });

    res.json(ordenes);
});

// Obtener orden por ID
const getOrdenById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const orden = await prisma.ordenes_servicio.findUnique({
        where: { id_orden: Number(id) },
        include: {
            vehiculo: {
                include: {
                    cliente: true
                }
            },
            empleado: true,
            detalle_orden: {
                include: {
                    servicio: true
                }
            },
            facturas: true
        }
    });

    if (!orden) {
        res.status(404);
        throw new Error('Orden no encontrada');
    }

    res.json(orden);
});

// Crear nueva orden de servicio
const createOrden = asyncHandler(async (req, res) => {
    const { 
        id_vehiculo, 
        id_empleado, 
        observaciones, 
        kilometraje, 
        servicios 
    } = req.body;

    // Validación
    if (!id_vehiculo || !servicios || !Array.isArray(servicios) || servicios.length === 0) {
        res.status(400);
        throw new Error('Vehículo y al menos un servicio son requeridos');
    }

    // Verificar que el vehículo existe
    const vehiculo = await prisma.vehiculos.findUnique({
        where: { id_vehiculo: Number(id_vehiculo) }
    });

    if (!vehiculo) {
        res.status(404);
        throw new Error('Vehículo no encontrado');
    }

    // Verificar empleado si se proporciona
    if (id_empleado) {
        const empleado = await prisma.empleados.findUnique({
            where: { id_empleado: Number(id_empleado) }
        });

        if (!empleado || !empleado.activo) {
            res.status(404);
            throw new Error('Empleado no encontrado o inactivo');
        }
    }

    // Validar servicios
    const serviciosIds = servicios.map(s => Number(s.id_servicio));
    const serviciosDB = await prisma.servicios.findMany({
        where: {
            id_servicio: { in: serviciosIds },
            activo: true
        }
    });

    if (serviciosDB.length !== servicios.length) {
        res.status(400);
        throw new Error('Uno o más servicios no son válidos');
    }

    // Crear orden con detalles
    const orden = await prisma.ordenes_servicio.create({
        data: {
            id_vehiculo: Number(id_vehiculo),
            id_empleado: id_empleado ? Number(id_empleado) : null,
            observaciones: observaciones?.trim(),
            kilometraje: kilometraje ? Number(kilometraje) : null,
            estado: 'pendiente',
            detalle_orden: {
                create: servicios.map(servicio => {
                    const servicioData = serviciosDB.find(s => s.id_servicio === Number(servicio.id_servicio));
                    const cantidad = servicio.cantidad || 1;
                    const precio_unit = parseFloat(servicioData.precio);
                    
                    return {
                        id_servicio: Number(servicio.id_servicio),
                        cantidad: cantidad,
                        precio_unit: precio_unit,
                        subtotal: precio_unit * cantidad
                    };
                })
            }
        },
        include: {
            vehiculo: {
                include: { cliente: true }
            },
            empleado: true,
            detalle_orden: {
                include: { servicio: true }
            }
        }
    });

    res.status(201).json(orden);
});

// Actualizar orden de servicio
const updateOrden = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { id_empleado, observaciones, estado, kilometraje, fecha_salida } = req.body;

    const ordenExists = await prisma.ordenes_servicio.findUnique({
        where: { id_orden: Number(id) }
    });

    if (!ordenExists) {
        res.status(404);
        throw new Error('Orden no encontrada');
    }

    // Verificar empleado si se proporciona (CORREGIDO)
    if (id_empleado) {
        const empleado = await prisma.empleados.findUnique({
            where: { id_empleado: Number(id_empleado) }
        });

        if (!empleado || !empleado.activo) {
            res.status(404);
            throw new Error('Empleado no encontrado o inactivo');
        }
    }

    // Validar estado
    const estadosValidos = ['pendiente', 'en_proceso', 'completado', 'entregado'];
    if (estado && !estadosValidos.includes(estado)) {
        res.status(400);
        throw new Error('Estado inválido');
    }

    const orden = await prisma.ordenes_servicio.update({
        where: { id_orden: Number(id) },
        data: {
            id_empleado: id_empleado ? Number(id_empleado) : undefined,
            observaciones: observaciones?.trim(),
            estado: estado,
            kilometraje: kilometraje ? Number(kilometraje) : undefined,
            fecha_salida: fecha_salida ? new Date(fecha_salida) : undefined
        },
        include: {
            vehiculo: {
                include: { cliente: true }
            },
            empleado: true,
            detalle_orden: {
                include: { servicio: true }
            }
        }
    });

    res.json(orden);
});

// Agregar servicio a una orden existente
const addServicioToOrden = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { id_servicio, cantidad } = req.body;

    if (!id_servicio) {
        res.status(400);
        throw new Error('id_servicio es requerido');
    }

    // Verificar que la orden existe
    const orden = await prisma.ordenes_servicio.findUnique({
        where: { id_orden: Number(id) }
    });

    if (!orden) {
        res.status(404);
        throw new Error('Orden no encontrada');
    }

    // Verificar que no esté completada
    if (orden.estado === 'completado' || orden.estado === 'entregado') {
        res.status(400);
        throw new Error('No se pueden agregar servicios a una orden completada');
    }

    // Verificar servicio
    const servicio = await prisma.servicios.findUnique({
        where: { id_servicio: Number(id_servicio) }
    });

    if (!servicio || !servicio.activo) {
        res.status(404);
        throw new Error('Servicio no encontrado o inactivo');
    }

    const cant = cantidad || 1;
    const precio_unit = parseFloat(servicio.precio);

    const detalle = await prisma.detalle_orden.create({
        data: {
            id_orden: Number(id),
            id_servicio: Number(id_servicio),
            cantidad: cant,
            precio_unit: precio_unit,
            subtotal: precio_unit * cant
        },
        include: {
            servicio: true
        }
    });

    res.status(201).json(detalle);
});

// Eliminar orden (CORREGIDO)
const deleteOrden = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const orden = await prisma.ordenes_servicio.findUnique({
        where: { id_orden: Number(id) },
        include: { facturas: true }
    });

    if (!orden) {
        res.status(404);
        throw new Error('Orden no encontrada');
    }

    if (orden.facturas.length > 0) {
        res.status(400);
        throw new Error('No se puede eliminar una orden con factura');
    }

    // CORREGIDO: Eliminar detalles primero
    await prisma.detalle_orden.deleteMany({
        where: { id_orden: Number(id) }
    });

    await prisma.ordenes_servicio.delete({
        where: { id_orden: Number(id) }
    });

    res.json({ message: 'Orden eliminada exitosamente' });
});

// Obtener estadísticas de órdenes
const getOrdenesStats = asyncHandler(async (req, res) => {
    const total = await prisma.ordenes_servicio.count();
    const pendientes = await prisma.ordenes_servicio.count({ where: { estado: 'pendiente' } });
    const enProceso = await prisma.ordenes_servicio.count({ where: { estado: 'en_proceso' } });
    const completadas = await prisma.ordenes_servicio.count({ where: { estado: 'completado' } });
    const entregadas = await prisma.ordenes_servicio.count({ where: { estado: 'entregado' } });

    res.json({
        total,
        pendientes,
        en_proceso: enProceso,
        completadas,
        entregadas
    });
});

module.exports = {
    getOrdenes,
    getOrdenById,
    createOrden,
    updateOrden,
    addServicioToOrden,
    deleteOrden,
    getOrdenesStats
};
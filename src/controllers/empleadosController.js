const prisma = require('../db');
const asyncHandler = require('express-async-handler');

// Obtener todos los empleados
const getEmpleados = asyncHandler(async (req, res) => {
    const { activo } = req.query;

    const where = activo !== undefined ? { activo: activo === 'true' } : {};

    const empleados = await prisma.empleados.findMany({
        where,
        orderBy: { nombre: 'asc' }
    });

    res.json(empleados);
});

// Obtener empleado por ID
const getEmpleadoById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const empleado = await prisma.empleados.findUnique({
        where: { id_empleado: Number(id) },
        include: {
            ordenes_servicio: {
                include: {
                    vehiculo: {
                        include: {
                            cliente: true
                        }
                    },
                    detalle_orden: {
                        include: {
                            servicio: true
                        }
                    }
                },
                orderBy: { fecha_entrada: 'desc' },
                take: 10
            }
        }
    });

    if (!empleado) {
        res.status(404);
        throw new Error('Empleado no encontrado');
    }

    res.json(empleado);
});

// Crear nuevo empleado
const createEmpleado = asyncHandler(async (req, res) => {
    const { nombre, especialidad, telefono, salario } = req.body;

    // Validación
    if (!nombre) {
        res.status(400);
        throw new Error('Nombre es requerido');
    }

    // Verificar si ya existe un empleado con ese nombre
    const empleadoExists = await prisma.empleados.findFirst({
        where: { 
            nombre: { 
                equals: nombre.trim(),
                mode: 'insensitive'
            } 
        }
    });

    if (empleadoExists) {
        res.status(409);
        throw new Error('Ya existe un empleado con ese nombre');
    }

    const empleado = await prisma.empleados.create({
        data: {
            nombre: nombre.trim(),
            especialidad: especialidad?.trim(),
            telefono: telefono?.trim(),
            salario: salario ? parseFloat(salario) : null
        }
    });

    res.status(201).json(empleado);
});

// Actualizar empleado
const updateEmpleado = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, especialidad, telefono, salario, activo } = req.body;

    const empleadoExists = await prisma.empleados.findUnique({
        where: { id_empleado: Number(id) }
    });

    if (!empleadoExists) {
        res.status(404);
        throw new Error('Empleado no encontrado');
    }

    const empleado = await prisma.empleados.update({
        where: { id_empleado: Number(id) },
        data: {
            nombre: nombre?.trim(),
            especialidad: especialidad?.trim(),
            telefono: telefono?.trim(),
            salario: salario ? parseFloat(salario) : undefined,
            activo: activo !== undefined ? Boolean(activo) : undefined
        }
    });

    res.json(empleado);
});

// Activar/Desactivar empleado
const toggleEmpleado = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const empleado = await prisma.empleados.findUnique({
        where: { id_empleado: Number(id) }
    });

    if (!empleado) {
        res.status(404);
        throw new Error('Empleado no encontrado');
    }

    const updated = await prisma.empleados.update({
        where: { id_empleado: Number(id) },
        data: {
            activo: !empleado.activo
        }
    });

    res.json({
        message: `Empleado ${updated.activo ? 'activado' : 'desactivado'} exitosamente`,
        empleado: updated
    });
});

// Eliminar empleado
const deleteEmpleado = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const empleado = await prisma.empleados.findUnique({
        where: { id_empleado: Number(id) },
        include: { ordenes_servicio: true }
    });

    if (!empleado) {
        res.status(404);
        throw new Error('Empleado no encontrado');
    }

    // Verificar si tiene órdenes asociadas
    if (empleado.ordenes_servicio.length > 0) {
        res.status(400);
        throw new Error('No se puede eliminar un empleado con órdenes asociadas. Considere desactivarlo.');
    }

    await prisma.empleados.delete({
        where: { id_empleado: Number(id) }
    });

    res.json({ message: 'Empleado eliminado exitosamente' });
});

// Obtener estadísticas de un empleado
const getEmpleadoStats = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const empleado = await prisma.empleados.findUnique({
        where: { id_empleado: Number(id) }
    });

    if (!empleado) {
        res.status(404);
        throw new Error('Empleado no encontrado');
    }

    const totalOrdenes = await prisma.ordenes_servicio.count({
        where: { id_empleado: Number(id) }
    });

    const ordenesPendientes = await prisma.ordenes_servicio.count({
        where: { 
            id_empleado: Number(id),
            estado: 'pendiente'
        }
    });

    const ordenesEnProceso = await prisma.ordenes_servicio.count({
        where: { 
            id_empleado: Number(id),
            estado: 'en_proceso'
        }
    });

    const ordenesCompletadas = await prisma.ordenes_servicio.count({
        where: { 
            id_empleado: Number(id),
            estado: 'completado'
        }
    });

    res.json({
        empleado: {
            id_empleado: empleado.id_empleado,
            nombre: empleado.nombre,
            especialidad: empleado.especialidad,
            activo: empleado.activo
        },
        estadisticas: {
            total_ordenes: totalOrdenes,
            pendientes: ordenesPendientes,
            en_proceso: ordenesEnProceso,
            completadas: ordenesCompletadas
        }
    });
});

// Obtener empleados más productivos del mes
const getEmpleadosProductivos = asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const empleados = await prisma.empleados.findMany({
        where: { activo: true },
        include: {
            ordenes_servicio: {
                where: {
                    fecha_entrada: {
                        gte: inicioMes
                    },
                    estado: 'completado'
                }
            }
        }
    });

    const resultado = empleados
        .map(emp => ({
            id_empleado: emp.id_empleado,
            nombre: emp.nombre,
            especialidad: emp.especialidad,
            ordenes_completadas: emp.ordenes_servicio.length
        }))
        .sort((a, b) => b.ordenes_completadas - a.ordenes_completadas)
        .slice(0, Number(limit));

    res.json(resultado);
});

// Buscar empleados
const searchEmpleados = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q) {
        res.status(400);
        throw new Error('Proporciona un término de búsqueda');
    }

    const empleados = await prisma.empleados.findMany({
        where: {
            OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { especialidad: { contains: q, mode: 'insensitive' } },
                { telefono: { contains: q } }
            ]
        }
    });

    res.json(empleados);
});

module.exports = {
    getEmpleados,
    getEmpleadoById,
    createEmpleado,
    updateEmpleado,
    toggleEmpleado,
    deleteEmpleado,
    getEmpleadoStats,
    getEmpleadosProductivos,
    searchEmpleados
};
const prisma = require('../db');
const asyncHandler = require('express-async-handler');

// Obtener todos los vehículos
const getVehiculos = asyncHandler(async (req, res) => {
    const vehiculos = await prisma.vehiculos.findMany({
        include: {
            cliente: true
        },
        orderBy: { id_vehiculo: 'desc' }
    });

    res.json(vehiculos);
});

// Obtener vehículo por ID
const getVehiculoById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const vehiculo = await prisma.vehiculos.findUnique({
        where: { id_vehiculo: Number(id) },
        include: {
            cliente: true,
            ordenes_servicio: {
                include: {
                    empleado: true,
                    detalle_orden: {
                        include: {
                            servicio: true
                        }
                    }
                },
                orderBy: { fecha_entrada: 'desc' }
            }
        }
    });

    if (!vehiculo) {
        res.status(404);
        throw new Error('Vehículo no encontrado');
    }

    res.json(vehiculo);
});

// Crear nuevo vehículo
const createVehiculo = asyncHandler(async (req, res) => {
    const { id_cliente, marca, modelo, anio, placas, color, vin } = req.body;

    // Validación
    if (!id_cliente || !marca || !modelo || !anio || !placas) {
        res.status(400);
        throw new Error('Cliente, marca, modelo, año y placas son requeridos');
    }

    // Verificar que el cliente existe
    const clienteExists = await prisma.clientes.findUnique({
        where: { id_cliente: Number(id_cliente) }
    });

    if (!clienteExists) {
        res.status(404);
        throw new Error('Cliente no encontrado');
    }

    // Verificar que las placas no existan
    const placasExist = await prisma.vehiculos.findUnique({
        where: { placas: placas.trim().toUpperCase() }
    });

    if (placasExist) {
        res.status(409);
        throw new Error('Ya existe un vehículo con esas placas');
    }

    // Verificar VIN si se proporciona
    if (vin) {
        const vinExists = await prisma.vehiculos.findUnique({
            where: { vin: vin.trim().toUpperCase() }
        });

        if (vinExists) {
            res.status(409);
            throw new Error('Ya existe un vehículo con ese VIN');
        }
    }

    const vehiculo = await prisma.vehiculos.create({
        data: {
            id_cliente: Number(id_cliente),
            marca: marca.trim(),
            modelo: modelo.trim(),
            anio: Number(anio),
            placas: placas.trim().toUpperCase(),
            color: color?.trim(),
            vin: vin?.trim().toUpperCase()
        },
        include: {
            cliente: true
        }
    });

    res.status(201).json(vehiculo);
});

// Actualizar vehículo
const updateVehiculo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { marca, modelo, anio, placas, color, vin } = req.body;

    const vehiculoExists = await prisma.vehiculos.findUnique({
        where: { id_vehiculo: Number(id) }
    });

    if (!vehiculoExists) {
        res.status(404);
        throw new Error('Vehículo no encontrado');
    }

    // Si se cambian las placas, verificar que no existan
    if (placas && placas !== vehiculoExists.placas) {
        const placasExist = await prisma.vehiculos.findUnique({
            where: { placas: placas.trim().toUpperCase() }
        });

        if (placasExist) {
            res.status(409);
            throw new Error('Ya existe un vehículo con esas placas');
        }
    }

    const vehiculo = await prisma.vehiculos.update({
        where: { id_vehiculo: Number(id) },
        data: {
            marca: marca?.trim(),
            modelo: modelo?.trim(),
            anio: anio ? Number(anio) : undefined,
            placas: placas?.trim().toUpperCase(),
            color: color?.trim(),
            vin: vin?.trim().toUpperCase()
        },
        include: {
            cliente: true
        }
    });

    res.json(vehiculo);
});

// Eliminar vehículo
const deleteVehiculo = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const vehiculo = await prisma.vehiculos.findUnique({
        where: { id_vehiculo: Number(id) },
        include: { ordenes_servicio: true }
    });

    if (!vehiculo) {
        res.status(404);
        throw new Error('Vehículo no encontrado');
    }

    if (vehiculo.ordenes_servicio.length > 0) {
        res.status(400);
        throw new Error('No se puede eliminar un vehículo con órdenes de servicio');
    }

    await prisma.vehiculos.delete({
        where: { id_vehiculo: Number(id) }
    });

    res.json({ message: 'Vehículo eliminado exitosamente' });
});

// Obtener vehículos de un cliente
const getVehiculosByCliente = asyncHandler(async (req, res) => {
    const { id_cliente } = req.params;

    const vehiculos = await prisma.vehiculos.findMany({
        where: { id_cliente: Number(id_cliente) },
        include: {
            ordenes_servicio: {
                orderBy: { fecha_entrada: 'desc' },
                take: 3
            }
        }
    });

    res.json(vehiculos);
});

// Buscar vehículos
const searchVehiculos = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q) {
        res.status(400);
        throw new Error('Proporciona un término de búsqueda');
    }

    const vehiculos = await prisma.vehiculos.findMany({
        where: {
            OR: [
                { placas: { contains: q, mode: 'insensitive' } },
                { marca: { contains: q, mode: 'insensitive' } },
                { modelo: { contains: q, mode: 'insensitive' } },
                { vin: { contains: q, mode: 'insensitive' } }
            ]
        },
        include: {
            cliente: true
        }
    });

    res.json(vehiculos);
});

module.exports = {
    getVehiculos,
    getVehiculoById,
    createVehiculo,
    updateVehiculo,
    deleteVehiculo,
    getVehiculosByCliente,
    searchVehiculos
};
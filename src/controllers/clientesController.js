const prisma = require('../db');
const asyncHandler = require('express-async-handler');

// Obtener todos los clientes
const getClientes = asyncHandler(async (req, res) => {
    const clientes = await prisma.clientes.findMany({
        include: {
            vehiculos: true
        },
        orderBy: { id_cliente: 'desc' }
    });

    res.json(clientes);
});

// Obtener un cliente por ID
const getClienteById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const cliente = await prisma.clientes.findUnique({
        where: { id_cliente: Number(id) },
        include: {
            vehiculos: {
                include: {
                    ordenes_servicio: {
                        orderBy: { fecha_entrada: 'desc' },
                        take: 5
                    }
                }
            }
        }
    });

    if (!cliente) {
        res.status(404);
        throw new Error('Cliente no encontrado');
    }

    res.json(cliente);
});

// Crear nuevo cliente
const createCliente = asyncHandler(async (req, res) => {
    const { nombre, direccion, telefono, correo } = req.body;

    // Validación
    if (!nombre || !telefono) {
        res.status(400);
        throw new Error('Nombre y teléfono son requeridos');
    }

    // Verificar si ya existe un cliente con ese teléfono
    const clienteExists = await prisma.clientes.findFirst({
        where: { telefono }
    });

    if (clienteExists) {
        res.status(409);
        throw new Error('Ya existe un cliente con ese número de teléfono');
    }

    const cliente = await prisma.clientes.create({
        data: {
            nombre: nombre.trim(),
            direccion: direccion?.trim(),
            telefono: telefono.trim(),
            correo: correo?.trim()
        }
    });

    res.status(201).json(cliente);
});

// Actualizar cliente
const updateCliente = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion, telefono, correo } = req.body;

    // Verificar que el cliente existe
    const clienteExists = await prisma.clientes.findUnique({
        where: { id_cliente: Number(id) }
    });

    if (!clienteExists) {
        res.status(404);
        throw new Error('Cliente no encontrado');
    }

    const cliente = await prisma.clientes.update({
        where: { id_cliente: Number(id) },
        data: {
            nombre: nombre?.trim(),
            direccion: direccion?.trim(),
            telefono: telefono?.trim(),
            correo: correo?.trim()
        }
    });

    res.json(cliente);
});

// Eliminar cliente
const deleteCliente = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const cliente = await prisma.clientes.findUnique({
        where: { id_cliente: Number(id) },
        include: { vehiculos: true }
    });

    if (!cliente) {
        res.status(404);
        throw new Error('Cliente no encontrado');
    }

    // Verificar si tiene vehículos asociados
    if (cliente.vehiculos.length > 0) {
        res.status(400);
        throw new Error('No se puede eliminar un cliente con vehículos asociados');
    }

    await prisma.clientes.delete({
        where: { id_cliente: Number(id) }
    });

    res.json({ message: 'Cliente eliminado exitosamente' });
});

// Buscar clientes
const searchClientes = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q) {
        res.status(400);
        throw new Error('Proporciona un término de búsqueda');
    }

    const clientes = await prisma.clientes.findMany({
        where: {
            OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { telefono: { contains: q } },
                { correo: { contains: q, mode: 'insensitive' } }
            ]
        },
        include: {
            vehiculos: true
        }
    });

    res.json(clientes);
});

module.exports = {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
    searchClientes
};
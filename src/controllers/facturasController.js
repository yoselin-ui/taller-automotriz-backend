const prisma = require('../db');
const asyncHandler = require('express-async-handler');

// Obtener todas las facturas
const getFacturas = asyncHandler(async (req, res) => {
    const { fecha_inicio, fecha_fin, metodo_pago } = req.query;

    let where = {};

    if (fecha_inicio && fecha_fin) {
        where.fecha = {
            gte: new Date(fecha_inicio),
            lte: new Date(fecha_fin)
        };
    }

    if (metodo_pago) {
        where.metodo_pago = metodo_pago;
    }

    const facturas = await prisma.facturas.findMany({
        where,
        include: {
            orden: {
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
                }
            }
        },
        orderBy: { fecha: 'desc' }
    });

    res.json(facturas);
});

// Obtener factura por ID
const getFacturaById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const factura = await prisma.facturas.findUnique({
        where: { id_factura: Number(id) },
        include: {
            orden: {
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
                }
            }
        }
    });

    if (!factura) {
        res.status(404);
        throw new Error('Factura no encontrada');
    }

    res.json(factura);
});

// Obtener factura por ID de orden
const getFacturaByOrden = asyncHandler(async (req, res) => {
    const { id_orden } = req.params;

    const factura = await prisma.facturas.findUnique({
        where: { id_orden: Number(id_orden) },
        include: {
            orden: {
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
                }
            }
        }
    });

    if (!factura) {
        res.status(404);
        throw new Error('Factura no encontrada para esta orden');
    }

    res.json(factura);
});

// Crear nueva factura
const createFactura = asyncHandler(async (req, res) => {
    const { id_orden, metodo_pago } = req.body;

    // Validación
    if (!id_orden) {
        res.status(400);
        throw new Error('id_orden es requerido');
    }

    // Verificar que la orden existe
    const orden = await prisma.ordenes_servicio.findUnique({
        where: { id_orden: Number(id_orden) },
        include: {
            detalle_orden: true,
            facturas: true
        }
    });

    if (!orden) {
        res.status(404);
        throw new Error('Orden no encontrada');
    }

    // Verificar que la orden no tenga ya una factura
    if (orden.facturas.length > 0) {
        res.status(400);
        throw new Error('Esta orden ya tiene una factura');
    }

    // Verificar que la orden esté completada
    if (orden.estado !== 'completado' && orden.estado !== 'entregado') {
        res.status(400);
        throw new Error('Solo se pueden facturar órdenes completadas');
    }

    // Calcular totales
    const subtotal = orden.detalle_orden.reduce((acc, det) => 
        acc + parseFloat(det.subtotal), 0
    );

    const iva = subtotal * 0.12; // IVA del 12%
    const total = subtotal + iva;

    // Crear factura
    const factura = await prisma.facturas.create({
        data: {
            id_orden: Number(id_orden),
            subtotal: subtotal,
            iva: iva,
            total: total,
            metodo_pago: metodo_pago?.trim() || 'efectivo'
        },
        include: {
            orden: {
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
                }
            }
        }
    });

    res.status(201).json(factura);
});

// Actualizar factura
const updateFactura = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { metodo_pago } = req.body;

    const facturaExists = await prisma.facturas.findUnique({
        where: { id_factura: Number(id) }
    });

    if (!facturaExists) {
        res.status(404);
        throw new Error('Factura no encontrada');
    }

    const factura = await prisma.facturas.update({
        where: { id_factura: Number(id) },
        data: {
            metodo_pago: metodo_pago?.trim()
        },
        include: {
            orden: {
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
                }
            }
        }
    });

    res.json(factura);
});

// Eliminar factura
const deleteFactura = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const factura = await prisma.facturas.findUnique({
        where: { id_factura: Number(id) }
    });

    if (!factura) {
        res.status(404);
        throw new Error('Factura no encontrada');
    }

    await prisma.facturas.delete({
        where: { id_factura: Number(id) }
    });

    res.json({ message: 'Factura eliminada exitosamente' });
});

// Obtener resumen de ventas
const getResumenVentas = asyncHandler(async (req, res) => {
    const totalFacturas = await prisma.facturas.count();

    const facturas = await prisma.facturas.findMany();

    const totalVentas = facturas.reduce((acc, f) => acc + parseFloat(f.total), 0);
    const totalIVA = facturas.reduce((acc, f) => acc + parseFloat(f.iva), 0);
    const totalSubtotal = facturas.reduce((acc, f) => acc + parseFloat(f.subtotal), 0);

    // Ventas por método de pago
    const ventasPorMetodo = await prisma.facturas.groupBy({
        by: ['metodo_pago'],
        _sum: {
            total: true
        },
        _count: {
            id_factura: true
        }
    });

    res.json({
        total_facturas: totalFacturas,
        total_ventas: parseFloat(totalVentas.toFixed(2)),
        total_iva: parseFloat(totalIVA.toFixed(2)),
        total_subtotal: parseFloat(totalSubtotal.toFixed(2)),
        ventas_por_metodo: ventasPorMetodo.map(v => ({
            metodo_pago: v.metodo_pago,
            total: parseFloat(v._sum.total || 0),
            cantidad: v._count.id_factura
        }))
    });
});

// Obtener ventas por período
const getVentasPorPeriodo = asyncHandler(async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    if (!fecha_inicio || !fecha_fin) {
        res.status(400);
        throw new Error('fecha_inicio y fecha_fin son requeridos');
    }

    const facturas = await prisma.facturas.findMany({
        where: {
            fecha: {
                gte: new Date(fecha_inicio),
                lte: new Date(fecha_fin)
            }
        },
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
        }
    });

    const totalVentas = facturas.reduce((acc, f) => acc + parseFloat(f.total), 0);

    res.json({
        periodo: {
            inicio: fecha_inicio,
            fin: fecha_fin
        },
        total_facturas: facturas.length,
        total_ventas: parseFloat(totalVentas.toFixed(2)),
        facturas: facturas
    });
});

module.exports = {
    getFacturas,
    getFacturaById,
    getFacturaByOrden,
    createFactura,
    updateFactura,
    deleteFactura,
    getResumenVentas,
    getVentasPorPeriodo
};
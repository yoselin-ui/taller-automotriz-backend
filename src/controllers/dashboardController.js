const prisma = require('../db');
const asyncHandler = require('express-async-handler');

// Obtener estadísticas generales del dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
    // Total de clientes
    const totalClientes = await prisma.clientes.count();

    // Total de vehículos
    const totalVehiculos = await prisma.vehiculos.count();

    // Total de órdenes
    const totalOrdenes = await prisma.ordenes_servicio.count();

    // Órdenes por estado
    const ordenesPendientes = await prisma.ordenes_servicio.count({
        where: { estado: 'pendiente' }
    });

    const ordenesEnProceso = await prisma.ordenes_servicio.count({
        where: { estado: 'en_proceso' }
    });

    const ordenesCompletadas = await prisma.ordenes_servicio.count({
        where: { estado: 'completado' }
    });

    const ordenesEntregadas = await prisma.ordenes_servicio.count({
        where: { estado: 'entregado' }
    });

    // Total de empleados activos
    const totalEmpleados = await prisma.empleados.count({
        where: { activo: true }
    });

    // Total de servicios activos
    const totalServicios = await prisma.servicios.count({
        where: { activo: true }
    });

    // Ventas del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const facturasDelMes = await prisma.facturas.findMany({
        where: {
            fecha: {
                gte: inicioMes
            }
        }
    });

    const ventasDelMes = facturasDelMes.reduce((acc, f) => acc + parseFloat(f.total), 0);
    const cantidadFacturasDelMes = facturasDelMes.length;

    // Ventas del día
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const facturasDelDia = await prisma.facturas.findMany({
        where: {
            fecha: {
                gte: inicioHoy
            }
        }
    });

    const ventasDelDia = facturasDelDia.reduce((acc, f) => acc + parseFloat(f.total), 0);

    res.json({
        clientes: {
            total: totalClientes
        },
        vehiculos: {
            total: totalVehiculos
        },
        ordenes: {
            total: totalOrdenes,
            pendientes: ordenesPendientes,
            en_proceso: ordenesEnProceso,
            completadas: ordenesCompletadas,
            entregadas: ordenesEntregadas
        },
        empleados: {
            total_activos: totalEmpleados
        },
        servicios: {
            total_activos: totalServicios
        },
        ventas: {
            del_dia: parseFloat(ventasDelDia.toFixed(2)),
            del_mes: parseFloat(ventasDelMes.toFixed(2)),
            facturas_del_mes: cantidadFacturasDelMes
        }
    });
});

// Obtener órdenes recientes
const getOrdenesRecientes = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const ordenes = await prisma.ordenes_servicio.findMany({
        take: Number(limit),
        orderBy: { fecha_entrada: 'desc' },
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
    });

    res.json(ordenes);
});

// Obtener clientes recientes
const getClientesRecientes = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const clientes = await prisma.clientes.findMany({
        take: Number(limit),
        orderBy: { created_at: 'desc' },
        include: {
            vehiculos: true
        }
    });

    res.json(clientes);
});

// Obtener actividad reciente (facturas recientes)
const getActividadReciente = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const facturas = await prisma.facturas.findMany({
        take: Number(limit),
        orderBy: { fecha: 'desc' },
        include: {
            orden: {
                include: {
                    vehiculo: {
                        include: {
                            cliente: true
                        }
                    },
                    empleado: true
                }
            }
        }
    });

    res.json(facturas);
});

// Obtener gráfica de ventas por mes (últimos 12 meses)
const getGraficaVentasMensuales = asyncHandler(async (req, res) => {
    const hace12Meses = new Date();
    hace12Meses.setMonth(hace12Meses.getMonth() - 12);

    const facturas = await prisma.facturas.findMany({
        where: {
            fecha: {
                gte: hace12Meses
            }
        },
        orderBy: { fecha: 'asc' }
    });

    // Agrupar por mes
    const ventasPorMes = {};
    
    facturas.forEach(factura => {
        const fecha = new Date(factura.fecha);
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        
        if (!ventasPorMes[mesKey]) {
            ventasPorMes[mesKey] = {
                mes: mesKey,
                total: 0,
                cantidad: 0
            };
        }
        
        ventasPorMes[mesKey].total += parseFloat(factura.total);
        ventasPorMes[mesKey].cantidad += 1;
    });

    // Convertir a array
    const resultado = Object.values(ventasPorMes).map(v => ({
        mes: v.mes,
        total: parseFloat(v.total.toFixed(2)),
        cantidad_facturas: v.cantidad
    }));

    res.json(resultado);
});

// Obtener distribución de órdenes por estado (para gráfica de pie)
const getDistribucionOrdenes = asyncHandler(async (req, res) => {
    const estados = ['pendiente', 'en_proceso', 'completado', 'entregado'];
    
    const distribucion = await Promise.all(
        estados.map(async (estado) => {
            const cantidad = await prisma.ordenes_servicio.count({
                where: { estado }
            });
            return {
                estado,
                cantidad
            };
        })
    );

    res.json(distribucion);
});

// Obtener servicios más vendidos del mes
const getServiciosMasVendidosMes = asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const detalles = await prisma.detalle_orden.findMany({
        where: {
            orden: {
                fecha_entrada: {
                    gte: inicioMes
                }
            }
        },
        include: {
            servicio: true
        }
    });

    // Agrupar por servicio
    const serviciosAgrupados = detalles.reduce((acc, detalle) => {
        const servicioId = detalle.id_servicio;
        if (!acc[servicioId]) {
            acc[servicioId] = {
                servicio: detalle.servicio,
                cantidad_vendida: 0,
                total_ingresos: 0
            };
        }
        acc[servicioId].cantidad_vendida += detalle.cantidad;
        acc[servicioId].total_ingresos += parseFloat(detalle.subtotal);
        return acc;
    }, {});

    // Convertir a array y ordenar
    const resultado = Object.values(serviciosAgrupados)
        .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida)
        .slice(0, Number(limit))
        .map(s => ({
            id_servicio: s.servicio.id_servicio,
            nombre: s.servicio.nombre,
            precio: parseFloat(s.servicio.precio),
            cantidad_vendida: s.cantidad_vendida,
            total_ingresos: parseFloat(s.total_ingresos.toFixed(2))
        }));

    res.json(resultado);
});

// Comparación mes actual vs mes anterior
const getComparacionMensual = asyncHandler(async (req, res) => {
    const hoy = new Date();
    
    // Mes actual
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    
    // Mes anterior
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);

    // Facturas mes actual
    const facturasMesActual = await prisma.facturas.findMany({
        where: {
            fecha: {
                gte: inicioMesActual,
                lte: finMesActual
            }
        }
    });

    // Facturas mes anterior
    const facturasMesAnterior = await prisma.facturas.findMany({
        where: {
            fecha: {
                gte: inicioMesAnterior,
                lte: finMesAnterior
            }
        }
    });

    const ventasMesActual = facturasMesActual.reduce((acc, f) => acc + parseFloat(f.total), 0);
    const ventasMesAnterior = facturasMesAnterior.reduce((acc, f) => acc + parseFloat(f.total), 0);

    const diferencia = ventasMesActual - ventasMesAnterior;
    const porcentajeCambio = ventasMesAnterior > 0 
        ? ((diferencia / ventasMesAnterior) * 100).toFixed(2) 
        : 0;

    res.json({
        mes_actual: {
            ventas: parseFloat(ventasMesActual.toFixed(2)),
            facturas: facturasMesActual.length
        },
        mes_anterior: {
            ventas: parseFloat(ventasMesAnterior.toFixed(2)),
            facturas: facturasMesAnterior.length
        },
        comparacion: {
            diferencia_ventas: parseFloat(diferencia.toFixed(2)),
            porcentaje_cambio: parseFloat(porcentajeCambio),
            tendencia: diferencia >= 0 ? 'positiva' : 'negativa'
        }
    });
});

module.exports = {
    getDashboardStats,
    getOrdenesRecientes,
    getClientesRecientes,
    getActividadReciente,
    getGraficaVentasMensuales,
    getDistribucionOrdenes,
    getServiciosMasVendidosMes,
    getComparacionMensual
};
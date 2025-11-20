const express = require("express");
const cors = require("cors");
const monitoringMiddleware = require("./middleware/monitoring");
const metricsRouter = require("./routes/metrics.routes");
const { startMetricsUpdater } = require("./services/metricsUpdater");

const authRoutes = require("./routes/authRoutes");
const clientesRoutes = require("./routes/clientesRoutes");
const vehiculosRoutes = require("./routes/vehiculosRoutes");
const serviciosRoutes = require("./routes/serviciosRoutes");
const empleadosRoutes = require("./routes/empleadosRoutes");
const ordenesRoutes = require("./routes/ordenesRoutes");
const facturasRoutes = require("./routes/facturasRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// Middlewares - EN ESTE ORDEN
app.use(
  cors({
    origin: [
      "http://localhost:3002",
      "http://localhost:3001", // DOMINIO CORREGIDO: SE AGREGA LA URL DE TU FRONTEND EN VERCEL
      "https://taller-automotriz-frontend-ten.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(monitoringMiddleware);

// Rutas
app.use("/api", metricsRouter);
app.use("/api/auth", authRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/vehiculos", vehiculosRoutes);
app.use("/api/servicios", serviciosRoutes);
app.use("/api/empleados", empleadosRoutes);
app.use("/api/ordenes", ordenesRoutes);
app.use("/api/facturas", facturasRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(
    `📊 Métricas disponibles en http://localhost:${PORT}/api/metrics`
  );
  console.log(`🏥 Health check en http://localhost:${PORT}/api/health`);
  startMetricsUpdater();
});

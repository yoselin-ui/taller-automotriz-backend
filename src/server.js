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

// Configuración flexible de CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir peticiones sin origin (Postman, apps móviles, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = ["http://localhost:3001", "http://localhost:3002"];

      // Permitir localhost o cualquier subdominio de vercel.app
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
    `🌐 CORS habilitado para localhost y todos los dominios *.vercel.app`
  );
  console.log(
    `📊 Métricas disponibles en http://localhost:${PORT}/api/metrics`
  );
  console.log(`🏥 Health check en http://localhost:${PORT}/api/health`);
  startMetricsUpdater();
});

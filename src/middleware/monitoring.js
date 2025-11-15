const { 
  httpRequestCounter, 
  httpRequestDuration, 
  activeConnections,
  errorCounter 
} = require('./metrics');

let connections = 0;

const monitoringMiddleware = (req, res, next) => {
  // Incrementar conexiones activas
  connections++;
  activeConnections.set(connections);

  // Marcar el inicio de la solicitud
  const start = Date.now();

  // Interceptar cuando la respuesta termine
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convertir a segundos
    const route = req.route ? req.route.path : req.path;

    // Registrar métricas
    httpRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route: route,
        status_code: res.statusCode
      },
      duration
    );

    // Si hay error (status >= 400), registrarlo
    if (res.statusCode >= 400) {
      errorCounter.inc({
        type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        route: route
      });
    }

    // Decrementar conexiones activas
    connections--;
    activeConnections.set(connections);
  });

  next();
};

module.exports = monitoringMiddleware;
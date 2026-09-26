const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 8080;
const DIST_FOLDER = path.join(__dirname, 'dist', 'api-frontend-empleados', 'browser');
const BACKEND_HOST = process.env.BACKEND_HOST || '3.147.76.228';
const BACKEND_PORT = process.env.BACKEND_PORT || 80;

// Verificación básica del build antes de iniciar
if (!fs.existsSync(DIST_FOLDER)) {
  console.warn(`[ADVERTENCIA] No se encontró el directorio de compilación en: ${DIST_FOLDER}`);
  console.warn(`Asegúrate de ejecutar 'npm run build' antes de iniciar el servidor en producción.`);
}

// Endpoint de salud para Azure App Service
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Proxy reverso para /api hacia el backend (evita problemas de CORS y Mixed Content en Azure HTTPS)
app.use('/api', (req, res) => {
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: `/api${req.url}`,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Error comunicando con el backend:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Error comunicando con el backend', details: err.message });
    }
  });

  req.pipe(proxyReq, { end: true });
});

// Servir archivos estáticos del build de Angular
app.use(express.static(DIST_FOLDER));

// Soporte para HTML5 PushState / enrutamiento SPA de Angular (compatible con Express 4 y Express 5)
app.use((req, res) => {
  const indexPath = path.join(DIST_FOLDER, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('La aplicación Angular aún no ha sido compilada. Ejecute "npm run build".');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de frontend escuchando en el puerto ${PORT}`);
  console.log(`Sirviendo estáticos desde: ${DIST_FOLDER}`);
  console.log(`Backend proxy apuntando a http://${BACKEND_HOST}:${BACKEND_PORT}`);
});

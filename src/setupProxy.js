const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://api.frontegg.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Remove '/api' prefix when forwarding to the target
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying request: ${req.method} ${req.url}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`Received response for: ${req.method} ${req.url} - Status: ${proxyRes.statusCode}`);
      },
    })
  );
};

import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { openApiSpec } from './openapi';

// Swagger UI from a pinned CDN build: nothing to bundle (works the same in Docker and on Vercel).
const SWAGGER_UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14';

/** GET /api/openapi.json (the spec) and GET /api/docs (Swagger UI). Public: the docs describe, they don't grant. */
export function docsRoutes(): Router {
  const router = Router();

  router.get('/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  router.get(['/docs', '/docs/'], (_req, res) => {
    // Helmet's default policy blocks the CDN and inline scripts; allow exactly what this page needs.
    const nonce = randomBytes(16).toString('base64');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        // Trailing slash: a CSP source path without one matches only that exact URL.
        `script-src 'self' 'nonce-${nonce}' ${SWAGGER_UI}/`,
        `style-src 'self' 'unsafe-inline' ${SWAGGER_UI}/`,
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "font-src 'self' data:",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Note Taking App API docs</title>
  <link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css" />
  <style>body { margin: 0; } .swagger-ui .topbar { display: none; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI}/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script nonce="${nonce}">
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      persistAuthorization: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      docExpansion: 'list',
    });
  </script>
</body>
</html>`);
  });

  return router;
}

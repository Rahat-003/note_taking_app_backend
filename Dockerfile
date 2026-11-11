FROM node:24-alpine

ENV NODE_ENV=production NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY migrations ./migrations
COPY bootstrap ./bootstrap

USER node
EXPOSE 3000
# Apply pending migrations and load bootstrap/*.json (both idempotent), then start the API.
CMD ["sh", "-c", "node src/scripts/migrate.js up && node bootstrap/index.js && exec node src/server.js"]

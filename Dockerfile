# Build: compile TypeScript to dist/
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY migrations ./migrations
COPY bootstrap ./bootstrap
RUN npm run build

# Runtime: production dependencies + compiled output only
FROM node:24-alpine
ENV NODE_ENV=production NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
# Apply pending migrations and load bootstrap/*.json (both idempotent), then start the API.
CMD ["sh", "-c", "node dist/src/scripts/migrate.js up && node dist/bootstrap/index.js && exec node dist/src/main.js"]

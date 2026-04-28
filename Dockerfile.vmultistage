FROM node:16-slim AS builder
WORKDIR /app
COPY package*.json app.js health.js ./
RUN npm install --save-dev esbuild
RUN npm run build

FROM node:16-slim AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 8090
CMD ["node", "dist/app.js"]
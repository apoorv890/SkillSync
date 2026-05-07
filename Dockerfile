FROM node:22-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server ./server

RUN npm ci --omit=dev && npm --prefix server install --omit=dev

WORKDIR /app/server

EXPOSE 5000
CMD ["node", "src/server.js"]

# Monorepo image: build once, run one workspace via SERVICE_SUBPATH (e.g. gateway, services/auth).
FROM node:22-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared ./shared
COPY gateway ./gateway
COPY client ./client
COPY services ./services

RUN npm ci --omit=dev

ARG SERVICE_SUBPATH=gateway
ENV SERVICE_SUBPATH=${SERVICE_SUBPATH}

WORKDIR /app/${SERVICE_SUBPATH}

EXPOSE 5000
CMD ["node", "src/server.js"]

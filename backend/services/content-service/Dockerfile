# Debian-based (node:slim) — Prisma engines work out of the box (Alpine/musl needs extra OpenSSL fiddling).
FROM node:24-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY prisma ./prisma
# @prisma/client postinstall generates the client from ./prisma/schema.prisma
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 8002
# Apply versioned migrations, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

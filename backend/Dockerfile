FROM node:20-slim

RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid appuser --no-create-home --shell /usr/sbin/nologin appuser

WORKDIR /app

COPY package.json package-lock.json ./
# Install all deps (including prisma CLI in devDependencies)
RUN npm ci


COPY prisma ./prisma
COPY lib ./lib
COPY prisma.config.ts ./
# Generate Prisma client at build time
RUN npx prisma generate
COPY server.js ./


USER appuser

EXPOSE 8080 5000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && node server.js"]

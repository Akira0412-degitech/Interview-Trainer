FROM node:20-slim

RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid appuser --no-create-home --shell /usr/sbin/nologin appuser

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./

USER appuser

EXPOSE 8080 5000

CMD ["node", "server.js"]

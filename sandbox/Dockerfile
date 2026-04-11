# Use a slim image with both Node and Python available
FROM node:20-slim

# Install Python3 with minimal footprint
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user for running the service
RUN groupadd --gid 1001 sandbox && \
    useradd --uid 1001 --gid sandbox --no-create-home --shell /usr/sbin/nologin sandbox

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./

# Ensure /tmp is writable by the sandbox user (code files go here)
RUN chmod 1777 /tmp

USER sandbox

EXPOSE 8888

CMD ["node", "server.js"]

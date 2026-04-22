FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# SSH host key lives in /tmp — writable at runtime
ENV SSH_HOST_KEY_PATH=/tmp/ssh_host_key
ENV PORT=2222

EXPOSE 2222

CMD ["node", "server.js"]

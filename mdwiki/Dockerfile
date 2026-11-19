FROM node:22-alpine
WORKDIR /app
COPY server.js ./
COPY public ./public
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
# Runs as the unprivileged user "node". The data folder must be writable by UID 1000.
USER node
EXPOSE 3000
CMD ["node", "server.js"]

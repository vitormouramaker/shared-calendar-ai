# Imagem da API (Node 22, sem root).
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY database.sql ./
COPY src ./src
COPY scripts ./scripts

USER node
EXPOSE 4444
CMD ["node", "src/app.js"]

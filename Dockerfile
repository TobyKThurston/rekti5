FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY config/ ./config/
COPY tsconfig.json ./
RUN npm install -g tsx
EXPOSE 3001
CMD ["tsx", "server/index.ts"]

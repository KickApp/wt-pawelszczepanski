# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json knexfile.ts ./
COPY src/ src/
RUN npm run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/knexfile.ts ./
COPY src/db/migrations/ ./src/db/migrations/
COPY Account_Transactions_of_Internet_Money_2025-01-01-2025-12-31.xlsx ./data/
EXPOSE 3000
CMD ["node", "dist/index.js"]

# GoldenERP Backend — Dockerfile (Backend standalone)
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# 1. Install dependencies
COPY package*.json ./
RUN npm install

# 2. Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# 3. Build application
COPY . .
RUN npm run build

# --- Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=7860

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Create uploads directory with full permissions
RUN mkdir -p uploads && chmod -R 777 uploads

EXPOSE 7860

CMD ["node", "dist/main.js"]

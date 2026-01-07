# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

ENV PORT=4100
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 4100

CMD ["npm", "run", "start:prod"]

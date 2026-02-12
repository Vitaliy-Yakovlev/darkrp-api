# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Runtime stage
FROM node:24-alpine

WORKDIR /app

# Copy built dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Remove files not needed in production
RUN rm -rf scripts/ .git/ .gitignore vercel.json

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]

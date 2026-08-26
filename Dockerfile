# Use Bun Alpine as base image
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy source code
COPY src/ ./src/


# Create non-root user
RUN addgroup -g 1001 -S bunuser
RUN adduser -S bunuser -u 1001

# Change ownership of the app directory
RUN chown -R bunuser:bunuser /app
USER bunuser

# Expose port
EXPOSE 5500

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "const http = require('http'); http.get('http://localhost:5500/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["bun", "run", "start"]

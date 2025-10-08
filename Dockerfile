# Dockerfile tối ưu cho multi-platform (ARM64 và AMD64)
# Hỗ trợ cả linux/amd64 và linux/arm64
FROM node:18-alpine

# Metadata
LABEL maintainer="BAA Server Team"
LABEL description="BAA Server - Intel/AMD64 optimized"
LABEL version="1.0"

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=3103

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài đặt các dependencies cần thiết cho build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Tạo user non-root trước khi copy files (bảo mật tốt hơn)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package.json và package-lock.json trước để tận dụng Docker layer caching
COPY --chown=nodejs:nodejs package*.json ./

# Cài đặt dependencies (bao gồm dev dependencies cho build)
RUN npm ci && npm cache clean --force

# Copy source code và set permissions
COPY --chown=nodejs:nodejs . .

# Build TypeScript project trong một layer riêng
RUN npx tsc --noCheck && \
    chown -R nodejs:nodejs dist/

# Clean up source files và chỉ giữ production dependencies
RUN rm -rf src/ *.ts tsconfig.json && \
    npm ci --omit=dev --silent && \
    npm cache clean --force

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3103

# Health check với retry logic tốt hơn
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 3103, timeout: 5000 }; const req = http.get(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.on('timeout', () => { req.destroy(); process.exit(1); });"

# Sử dụng dumb-init để handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Chạy ứng dụng
CMD ["node", "dist/server.js"]

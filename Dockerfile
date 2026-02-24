# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

WORKDIR /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=builder /app/dist/ ./

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]

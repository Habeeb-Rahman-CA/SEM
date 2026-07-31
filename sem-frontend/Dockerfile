# syntax=docker/dockerfile:1.6
# ═══════════════════════════════════════════════════════════════════════════════
# Stage 1: Build the Angular bundle
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run build -- --configuration=production

# ═══════════════════════════════════════════════════════════════════════════════
# Stage 2: Serve with nginx
# ═══════════════════════════════════════════════════════════════════════════════
FROM nginx:1.27-alpine AS runtime

# Add curl for the healthcheck; delete default site
RUN apk add --no-cache curl \
    && rm -f /etc/nginx/conf.d/default.conf

# Custom nginx.conf enables HTTP/2, gzip, immutable asset caching,
# rate limiting, security headers, and reverse-proxy upstreams.
COPY nginx.conf /etc/nginx/conf.d/default.conf
# The TLS variant is shipped alongside; operators can swap the mount in
# prod (or copy it over at runtime) once certs are provisioned.
COPY nginx-tls.conf /etc/nginx/conf.d/nginx-tls.conf.disabled

COPY --from=build /app/dist/sem-frontend/browser /usr/share/nginx/html

# nginx image already runs as `nginx` user for worker processes; the
# master needs root for port <1024 binding. If you front nginx with a
# non-privileged ingress (typical in k8s), run this container as the
# `nginx` user by uncommenting the next line.
# USER nginx

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]

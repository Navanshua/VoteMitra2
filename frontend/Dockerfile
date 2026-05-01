# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# Build args are injected at build time
ARG VITE_GCP_API_KEY
ARG VITE_GCP_PROJECT_ID
ARG VITE_BACKEND_URL
ARG VITE_MESSAGING_SENDER_ID
ARG VITE_APP_ID
ENV VITE_GCP_API_KEY=$VITE_GCP_API_KEY
ENV VITE_GCP_PROJECT_ID=$VITE_GCP_PROJECT_ID
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_MESSAGING_SENDER_ID=$VITE_MESSAGING_SENDER_ID
ENV VITE_APP_ID=$VITE_APP_ID

RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────
FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

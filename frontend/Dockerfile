# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Change package*.json to package.json to be safe
COPY package.json ./
# If you HAVE a package-lock.json, use 'npm ci'. If not, use 'npm install'
RUN npm install 

COPY . .

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Ensure the path /app/dist matches where Vite puts your build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
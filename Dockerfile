# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Remove default content and config
RUN rm -rf /usr/share/nginx/html/*

# Copy dist to /2048 subpath (for non-stripped proxy)
RUN mkdir -p /usr/share/nginx/html/2048
COPY --from=build /app/dist /usr/share/nginx/html/2048

# Also copy dist to root (for stripped proxy)
COPY --from=build /app/dist /usr/share/nginx/html

# Verify both locations have files
RUN echo "=== Files at /2048 ===" && ls -la /usr/share/nginx/html/2048/assets/ \
 && echo "=== Files at root ===" && ls -la /usr/share/nginx/html/assets/

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

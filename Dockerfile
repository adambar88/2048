# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Create directory for the app to be served from the /2048 subpath
RUN mkdir -p /usr/share/nginx/html/2048
COPY --from=build /app/dist /usr/share/nginx/html/2048

# Custom nginx config if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

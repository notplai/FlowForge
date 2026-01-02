FROM node:alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
# RUN npm install cors express react react-dom
RUN npm ci

COPY . .

RUN npm run build

# Runtime stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

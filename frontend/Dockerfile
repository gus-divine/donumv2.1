FROM node:20-alpine AS base

WORKDIR /app

# Set environment variables for file watching in Docker
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 80

ENV PORT=80

CMD ["npm", "run", "dev"]

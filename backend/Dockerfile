FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 4003

ENV PORT=4003

CMD ["npm", "run", "dev"]

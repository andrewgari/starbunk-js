FROM node:latest
WORKDIR /bunkbot
COPY package.json .
RUN npm install && npm ci
COPY . .
CMD [ "node", "src/bunkbot.ts" ]
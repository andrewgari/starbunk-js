FROM node:latest as build
RUN mkdir -p /home/node/bunkbot/node_modules && chown -R node:node /home/node/bunkbot
WORKDIR /home/node/bunkbot
COPY package*.json ./
RUN npm i
CMD [ "node", "src/bunkbot.ts" ]
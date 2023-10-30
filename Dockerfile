FROM node:latest
WORKDIR /bunkbot
COPY package.json ./
RUN yarn install --production
COPY . .
CMD [ "node", "src/bunkbot.ts" ]
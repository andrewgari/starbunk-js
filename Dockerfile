FROM node:alpine
WORKDIR /run/bunkbot
COPY package.json .
COPY . .
RUN yarn install
RUN yarn global add ts-node
CMD [ "ts-node", "src/bunkbot.ts"]

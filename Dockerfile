FROM node:alpine
WORKDIR /run/bunkbot
COPY package.json .
COPY . .
RUN yarn add distube
RUN yarn global add ts-node
RUN yarn global add is-ci
RUN yarn install --ignore-scripts

CMD [ "ts-node", "src/bunkbot.ts"]

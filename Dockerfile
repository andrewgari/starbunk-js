FROM node:latest as build
WORKDIR /home/node/bunkbot
COPY package*.json ./
RUN npm i
COPY . .

FROM build as production
ENV NODE_PATH=./build
RUN npm run build
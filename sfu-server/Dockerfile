FROM node:latest

WORKDIR /backend

COPY package*.json ./

RUN apt-get update && apt-get install -y python3 python3-pip build-essential bash

RUN npm install 

COPY . .

CMD ["npm", "start"]

EXPOSE 5080

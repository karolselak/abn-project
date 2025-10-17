FROM node:20.10.0-bullseye

RUN npm install -g @nestjs/cli

RUN mkdir /app
WORKDIR /app

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

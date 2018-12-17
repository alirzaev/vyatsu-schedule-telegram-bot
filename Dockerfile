FROM node:10-alpine
EXPOSE 80

WORKDIR /usr/src/project

COPY package.json ./
RUN npm install

COPY . .

ENV NODE_ENV production

CMD ["sh", "./start.sh"]

FROM node:20-alpine

WORKDIR /app

COPY package.json server.js index.html style.css script.js ./
COPY assets ./assets
COPY docs ./docs

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=8001
ENV HOST=0.0.0.0
ENV GAME_DATA_DIR=/app/data

VOLUME ["/app/data"]
EXPOSE 8001

CMD ["node", "server.js"]

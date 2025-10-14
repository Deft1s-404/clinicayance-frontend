FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm install

COPY tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js ./
COPY app ./app
COPY components ./components
COPY context ./context
COPY hooks ./hooks
COPY lib ./lib
COPY types ./types

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]

FROM node:22.14-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY . .
RUN npm run build

FROM node:22.14-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY .env.example ./.env.example

USER nestjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

EXPOSE 3000
CMD ["node", "dist/main.js"]

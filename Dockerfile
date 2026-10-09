FROM node:24-alpine AS test
ENV NODE_ENV=test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY lib ./lib
COPY public ./public
COPY server.mjs ./server.mjs
COPY test ./test
COPY playwright.config.mjs ./playwright.config.mjs
CMD ["sh", "-c", "npm run check && npm test"]

FROM node:24-alpine AS app
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache su-exec
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY lib ./lib
COPY public ./public
COPY server.mjs ./server.mjs
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh && mkdir -p /var/data/workspaces && chown -R node:node /app /var/data
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
EXPOSE 8080
CMD ["node", "server.mjs"]

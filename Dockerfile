# ---- build stage: compile the React/Vite app ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- runtime stage: proxy server + static dist/, nothing else ----
FROM node:20-alpine AS runtime
WORKDIR /app
COPY server/package.json ./server/
RUN npm install --omit=dev --prefix server
COPY server ./server
COPY --from=build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/index.js"]

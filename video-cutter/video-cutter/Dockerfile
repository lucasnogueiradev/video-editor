# Etapa de build
FROM node:20 AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Etapa de produção
FROM node:20-slim AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
RUN npm install -g serve
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"] 
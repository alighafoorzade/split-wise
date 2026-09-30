FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/app/.data/expenses.sqlite
EXPOSE 3001
CMD ["npm","start"]

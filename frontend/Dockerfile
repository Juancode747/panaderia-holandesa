FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN npx --yes craco --version || npm install -g @craco/craco
COPY . .
RUN ./node_modules/.bin/craco build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]

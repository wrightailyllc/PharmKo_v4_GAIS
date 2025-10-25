FROM node:18.18-slim as builder
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Cloud Run requires the container to listen on $PORT
ENV PORT=8080
RUN sed -i 's/listen 8080/listen $PORT/g' /etc/nginx/conf.d/default.conf
CMD sh -c "envsubst '\$PORT' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp && \
    mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf && \
    nginx -g 'daemon off;'"
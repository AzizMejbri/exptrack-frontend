FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .


# Copy dev CA so Node trusts backend certificate
COPY dev-ca.crt /usr/local/share/ca-certificates/dev-ca.crt
RUN apk add ca-certificates
RUN update-ca-certificates

# Expose Angular port (HTTPS)
EXPOSE 4200

# Run Angular dev server with HTTPS
CMD npx ng serve \
  --host 0.0.0.0 \
  --port ${FRONTEND_PORT} \
  --ssl true \
  --ssl-key ${SSL_KEY} \
  --ssl-cert ${SSL_CERT}

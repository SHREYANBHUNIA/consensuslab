FROM golang:1.24-alpine AS go-verifier
WORKDIR /src/go-core
COPY go-core/go.mod ./
RUN go mod download
COPY go-core/ ./
RUN go test ./...

FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm install -g corepack@latest && corepack pnpm install && corepack pnpm run build
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod ./
COPY go.su[m] ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
ARG SERVICE_NAME
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/${SERVICE_NAME}

# Final stage
FROM alpine:latest

# Install runtime dependencies for running generated code
RUN apk --no-cache add ca-certificates nodejs npm python3 go lsof

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./main"]

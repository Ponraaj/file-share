FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY server/package.json server/bun.lock ./server/

WORKDIR /app/server

RUN bun install --production --frozen-lockfile

COPY server/index.ts ./index.ts

COPY public /app/public

RUN bun build index.ts \
    --compile \
    --outfile /app/server-app \
    --minify \
    --target=bun-linux-x64-baseline \
 && chmod +x /app/server-app

FROM scratch

WORKDIR /app

COPY --from=builder /lib/ld-musl-*.so.1 /lib/
COPY --from=builder /usr/lib/libgcc_s.so.1 /usr/lib/
COPY --from=builder /usr/lib/libstdc++.so.6 /usr/lib/
COPY --from=builder /app/server-app ./server-app
COPY --from=builder /app/public ./public

EXPOSE 6969

CMD ["./server-app"]

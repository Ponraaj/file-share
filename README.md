# File-Share: P2P File Sharing with WebRTC

A lightweight peer-to-peer file sharing application that allows a sender to share files with multiple receivers in real-time using **WebRTC**. The signaling server is built using **Bun**.

---

## Features

- Real-time file transfer between sender and multiple receivers
- Dynamic session links generated for each file sharing session
- WebSocket-based signaling server
- STUN server support for NAT traversal
- No backend storage required; files are transferred directly between peers
- Works over HTTPS/WSS for secure connections

---

## Tech Stack

- **Frontend:** HTML, JavaScript (sender and receiver pages)
- **Backend:** Bun (`serve` with WebSocket support)
- **WebRTC:** Real-time peer-to-peer data channel

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/)

### Installation

```bash
# Clone the repo
git clone https://github.com/ponraaj/file-share.git
cd file-share/server

# Install dependencies
bun install
```

## Running Locally

```bash
bun run server/index.ts
```

### Using Docker

```bash
docker build -t file-share .
docker run -p 6969:6969 file-share
```

## License

MIT

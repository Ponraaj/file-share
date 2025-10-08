import { serve, type ServerWebSocket } from "bun";

type WSData = { id: string };

const peers = new Map<string, ServerWebSocket<WSData>[]>();

serve({
  port: 6969,

  fetch(req, server) {
    if (server.upgrade(req)) return;

    const url = new URL(req.url);
    let path = url.pathname;


    if (path === "/") path = "/sender.html";
    else if (path === "/receive") path = "/receive.html";
    else if(path.startsWith("/.well-known")) return new Response(null,{status:204})

    try {
      const file = Bun.file(`./public${path}`);
      return new Response(file)
    } catch (error) {
      return new Response("Not Found", { status: 404 });
    }
  },

  websocket: {
    open(ws: ServerWebSocket<WSData>) {},

    message(ws: ServerWebSocket<WSData>, raw) {
      const msg = JSON.parse(raw.toString());

      if (!ws.data?.id && msg.id) {
        ws.data = { id: msg.id };
        if (!peers.has(msg.id)) peers.set(msg.id, []);
        peers.get(msg.id)!.push(ws);

        const others = peers.get(msg.id)!.filter((p) => p !== ws);
        for (const peer of others) {
          if (peer.readyState === WebSocket.OPEN) {
            peer.send(JSON.stringify({ type: "ready" }));
          }
        }

        console.log(`joined room ${msg.id}`);
        return;
      }

      const id = ws.data?.id;
      if (!id || !peers.has(id)) return;

      for (const peer of peers.get(id) ?? []) {
        if (peer !== ws && peer.readyState === WebSocket.OPEN) {
          peer.send(raw);
        }
      }
    },

    close(ws: ServerWebSocket<WSData>) {
      const id = ws.data?.id;
      if (!id || !peers.has(id)) return;

      const remainingPeers = peers.get(id)!.filter((p) => p !== ws);
      if (remainingPeers.length > 0) {
        peers.set(id, remainingPeers);
      } else {
        peers.delete(id);
      }

      console.log(`disconnected`);
    },
  },
});

console.log("server running on http://localhost:6969");

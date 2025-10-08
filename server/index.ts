import { serve, type ServerWebSocket } from "bun";

type WSData = { sessionId: string; clientId: string };

const sessions = new Map<string, Map<string, ServerWebSocket<WSData>>>();

serve({
  port: 6969,

  fetch(req, server) {
    if (server.upgrade(req)) return;

    const url = new URL(req.url);
    let path = url.pathname;

    if (path === "/") path = "/sender.html";
    else if (path === "/receive") path = "/receive.html";
    else if (path.startsWith("/.well-known"))
      return new Response(null, { status: 204 });

    try {
      const file = Bun.file(`./public${path}`);
      return new Response(file);
    } catch (error) {
      return new Response("Not Found", { status: 404 });
    }
  },

  websocket: {
    open(ws: ServerWebSocket<WSData>) {},

    message(ws: ServerWebSocket<WSData>, raw) {
      const msg = JSON.parse(raw.toString());

      if (!ws.data?.sessionId && msg.sessionId && msg.clientId) {
        ws.data = { sessionId: msg.sessionId, clientId: msg.clientId };
        if (!sessions.has(msg.sessionId))
          sessions.set(msg.sessionId, new Map());
        sessions.get(msg.sessionId)!.set(msg.clientId, ws);

        for (const [id, peer] of sessions.get(msg.sessionId)!) {
          if (id !== msg.clientId && peer.readyState === WebSocket.OPEN) {
            peer.send(JSON.stringify({ type: "ready", from: msg.clientId }));
          }
        }

        console.log(`joined room ${msg.sessionId}`);
      }

      if (ws.data?.sessionId && msg.to) {
        const target = sessions.get(ws.data.sessionId)?.get(msg.to);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ ...msg, from: ws.data.clientId }));
        }
      }
    },

    close(ws: ServerWebSocket<WSData>) {
      const { sessionId, clientId } = ws.data || {};
      if (!sessionId || !clientId) return;

      const session = sessions.get(sessionId);
      if (!session) return;

      session.delete(clientId);
      if (session.size === 0) sessions.delete(sessionId);

      console.log(`disconnected`);
    },
  },
});

console.log("server running on http://localhost:6969");

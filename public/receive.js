const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get("id");

if (!sessionId) {
  document.getElementById("status").textContent = "No session ra dei";
  throw new Error("Session Id venum da");
}

let rtc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});
let ws = new WebSocket(`ws://${location.host}`);

let filename = "received-file";
let mimeType = "application/octet-stream";
let receivedChunks = [];
let gotMeta = false;

ws.onopen = () => {
  ws.send(JSON.stringify({ id: sessionId }));
};

rtc.onicecandidate = ({ candidate }) => {
  if (candidate) {
    ws.send(JSON.stringify({ type: "ice", ice: candidate }));
  }
};

rtc.ondatachannel = (e) => {
  const channel = e.channel;

  channel.onopen = () => {
    document.getElementById("status").textContent =
      "Channel open, waiting for file...";
  };

  channel.onmessage = (msg) => {
    if (typeof msg.data === "string") {
      try {
        const json = JSON.parse(msg.data);

        if (json.type === "meta") {
          filename = json.filename || "file";
          mimeType = json.mime || "application/octet-stream";
          gotMeta = true;
          return;
        }

        if (json.done) {
          const blob = new Blob(receivedChunks, { type: mimeType });
          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.textContent = `Click to download ${filename}`;
          document.body.appendChild(link);

          document.getElementById("status").textContent = "File received!";
          receivedChunks = [];
          return;
        }
      } catch (err) {
        console.log("Invalid format bro", msg.data);
      }
    } else {
      receivedChunks.push(msg.data);
    }
  };
};

ws.onmessage = async ({ data }) => {
  const msg = JSON.parse(data);

  if (msg.type === "offer") {
    await rtc.setRemoteDescription(msg.sdp);
    const answer = await rtc.createAnswer();
    await rtc.setLocalDescription(answer);

    ws.send(JSON.stringify({ type: "answer", sdp: answer }));
  } else if (msg.type === "ice") {
    await rtc.addIceCandidate(msg.ice);
  }
};

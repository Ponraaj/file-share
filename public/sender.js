const sessionId = crypto.randomUUID();

let fileToSend = null;

const connections = new Map();

window.sendFile = async function () {
  fileToSend = document.getElementById("fileInput").files[0];
  if (!fileToSend) {
    alert("File kudra");
    return;
  }
  const baseUrl = location.origin;
  const linkDOM = document.getElementById("link");
  const shareLink = `${baseUrl}/receive?id=${sessionId}`;
  linkDOM.innerHTML = `Share this link: <a href="${shareLink}" target="_blank">${baseUrl}/receive?id=${sessionId}</a>`;

  const copyBtn = document.getElementById("copy");
  copyBtn.style.display = "inline-block";

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(shareLink);
  };

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ sessionId, clientId: "sender" }));
  };

  ws.onmessage = async ({ data }) => {
    const msg = JSON.parse(data);

    if (msg.type === "ready") {
      const receiverId = msg.from;
      const rtc = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      });

      const dc = rtc.createDataChannel("file");

      dc.onopen = () => {
        dc.send(
          JSON.stringify({
            type: "meta",
            filename: fileToSend.name,
            mime: fileToSend.type,
          }),
        );

        const stream = fileToSend.stream();
        const reader = stream.getReader();

        function handleReading(done, value) {
          if (done) {
            dc.send(JSON.stringify({ done: true }));
            return;
          }

          dc.send(value);
          reader.read().then(({ done, value }) => {
            handleReading(done, value);
          });
        }

        reader.read().then(({ done, value }) => {
          handleReading(done, value);
        });
      };

      rtc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          ws.send(
            JSON.stringify({ type: "ice", ice: candidate, to: receiverId }),
          );
        }
      };

      const offer = await rtc.createOffer();
      await rtc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "offer", sdp: offer, to: receiverId }));
      connections.set(receiverId, { rtc, dc });
    } else if (msg.type === "answer") {
      const conn = connections.get(msg.from);

      if (conn) await conn.rtc.setRemoteDescription(msg.sdp);
    } else if (msg.type === "ice") {
      const conn = connections.get(msg.from);

      if (conn) await conn.rtc.addIceCandidate(msg.ice);
    }
  };
};

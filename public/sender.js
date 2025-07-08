const sessionId = crypto.randomUUID();

let ws, rtc, dc;
let fileToSend = null;

window.sendFile = async function () {
  const baseUrl = location.origin;
  const linkDOM = document.getElementById("link");
  linkDOM.innerHTML = `Share this link: <a href="${baseUrl}/receive?id=${sessionId}" target="_blank">${baseUrl}/receive?id=${sessionId}</a>`;

  fileToSend = document.getElementById("fileInput").files[0];
  if (!fileToSend) {
    alert("File kudra");
    return;
  }

  rtc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  dc = rtc.createDataChannel("file");
  ws = new WebSocket(`ws://${location.host}`);

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
      ws.send(JSON.stringify({ type: "ice", ice: candidate }));
    }
  };

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: sessionId }));
  };

  ws.onmessage = async ({ data }) => {
    const msg = JSON.parse(data);

    if (msg.type === "ready") {
      const offer = await rtc.createOffer();
      await rtc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "offer", sdp: offer }));
    } else if (msg.type === "answer") {
      await rtc.setRemoteDescription(msg.sdp);
    } else if (msg.type === "ice") {
      await rtc.addIceCandidate(msg.ice);
    }
  };
};

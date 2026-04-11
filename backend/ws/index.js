import { WebSocketServer } from "ws";

export function createWebSocketServer(server, sessionMiddleware) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, request) => {
    const sess = request.session;

    ws.on("message", async (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        switch (parsedMessage.type) {
          case "code":
            sess.code = parsedMessage.code;
            break;
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(JSON.stringify({ error: "An error occurred." }));
      }
    });
  });

  server.on("upgrade", (request, socket, head) => {
    if (request.url === "/api/session") {
      sessionMiddleware(request, {}, () => {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      });
    } else {
      socket.destroy();
    }
  });

  return wss;
}

import express from "express";
import session from "express-session";

import openai from "openai";
import { WebSocketServer, WebSocket } from "ws";
import httpServer from "http";


const app = express();
const webSocketServer = new WebSocketServer({ noServer: true });
const server = httpServer.createServer(app);
const sessionMiddleware = session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: true,
});


app.use(express.json());
app.use(sessionMiddleware);

function handleUpgrade(request, socket, head) {
  sessionMiddleware(request, {}, () => {
    webSocketServer.handleUpgrade(request, socket, head, (ws) => {
      webSocketServer.emit("connection", ws, request);
    });
  });
}

webSocketServer.on("connection", (ws, request) => {
  const session = request.session;

  ws.on("message", async (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.type === "sync") {
        session.code = parsedMessage.code;
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          error: "An error occurred while processing your request.",
        }),
      );
    }
  });
});

server.on("upgrade", (request, socket, head) => {
  if (request.url === "/api/sync") {
    handleUpgrade(request, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});

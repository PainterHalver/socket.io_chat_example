const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgCyan = "\x1b[36m";
const BgRed = "\x1b[41m";
const BgGreen = "\x1b[42m";
const BgCyan = "\x1b[46m";

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.nickname = socket.handshake.query.nickname;

  console.log(
    FgGreen,
    `A user connected, one new socket opened, total: ${io.engine.clientsCount}`
  );
  console.log(FgCyan, `Socket ID: ${socket.id}, nickname: ${socket.nickname}`);

  // emit to all clients except the sender
  socket.broadcast.emit(
    "chat message",
    `${socket.nickname} joined the chat, total: ${io.engine.clientsCount}`
  );

  // When someone is typing
  socket.on("typing", (isTyping) => {
    socket.broadcast.emit("typing", { nickname: socket.nickname, isTyping });
  });

  // When someone sends a message
  socket.on("chat message", (msg) => {
    console.log(FgCyan, `Received message: ${msg}`);

    // Emit the same event name.
    socket.broadcast.emit("chat message", `${socket.nickname}: ${msg}`);
  });

  // When someone disconnects
  socket.on("disconnect", (reason) => {
    console.log(
      FgRed,
      `${socket.nickname} disconnected, total: ${io.engine.clientsCount}, reason: ${reason}`
    );
    io.emit(
      "chat message",
      `${socket.nickname} left the chat, total: ${io.engine.clientsCount}`
    );
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});

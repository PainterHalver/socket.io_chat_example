const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgCyan = "\x1b[36m";
const BgRed = "\x1b[41m";
const BgGreen = "\x1b[42m";
const BgCyan = "\x1b[46m";

app.use(express.static(path.join(__dirname, "public")));

// io events
io.on("connection", (socket) => {
  socket.nickname = socket.handshake.auth.nickname;

  console.log(
    FgGreen,
    `A user connected, one new socket opened, total: ${io.engine.clientsCount}`
  );
  console.log(FgCyan, `Socket ID: ${socket.id}, nickname: ${socket.nickname}`);

  // Send the current online count to the all users
  io.emit("online count change", io.engine.clientsCount);

  // emit to all clients except the sender
  io.emit(
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
    io.emit("chat message", `${socket.nickname}: ${msg}`);
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
    io.emit("online count change", io.engine.clientsCount);
  });
});

// Express routes
app.get("/api/users", async (req, res) => {
  const sockets = await io.fetchSockets();
  const users = sockets.map((socket) => {
    return {
      nickname: socket.nickname,
      socketId: socket.id,
    };
  });
  res.status(200).json(users);
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}...`);
});

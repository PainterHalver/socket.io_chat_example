const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const Reset = "\x1b[0m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgCyan = "\x1b[36m";
const BgRed = "\x1b[41m";
const BgGreen = "\x1b[42m";
const BgCyan = "\x1b[46m";

app.use(express.static(path.join(__dirname, "public")));

// io middlewares
io.use(async (socket, next) => {
  const nickname = socket.handshake.auth.nickname;
  if (!nickname) {
    return next(new Error("invalid nickname"));
  }

  const sockets = await io.fetchSockets();
  if (sockets.find((s) => s.handshake.auth.nickname === nickname)) {
    return next(new Error("nickname already taken"));
  }

  socket.nickname = nickname;
  next();
});

// io events
io.on("connection", (socket) => {
  console.log(FgGreen, `A user connected, one new socket opened, total: ${io.engine.clientsCount}`, Reset);
  console.log(FgCyan, `Socket ID: ${socket.id}, nickname: ${socket.nickname}`, Reset);

  // Send the connected user to all users
  io.emit("user connected", {
    nickname: socket.nickname,
    id: socket.id,
    messages: [],
  });

  // emit to all clients except the sender
  io.emit("global message", `/text-green-500 ${socket.nickname} joined the chat, total: ${io.engine.clientsCount}`);

  // When someone is typing
  socket.on("typing", ({ isTyping, to }) => {
    socket.broadcast.emit("typing", {
      nickname: socket.nickname,
      isTyping,
      to,
    });
  });

  // When someone sends a message
  socket.on("global message", (msg) => {
    console.log(FgCyan, `Received message: ${msg}`, Reset);

    // Emit the same event name.
    io.emit("global message", `${socket.nickname}: ${msg}`);
  });

  // When someone sends a private message
  socket.on("private message", ({ to, message }) => {
    // Socket instance automatically joins the room identified by the its id
    // so we send the message to room with the id of the recipient
    socket.to(to).emit("private message", {
      from: socket.id,
      message,
    });
  });

  // When someone disconnects
  socket.on("disconnect", (reason) => {
    console.log(FgRed, `${socket.nickname} disconnected, total: ${io.engine.clientsCount}, reason: ${reason}`, Reset);
    io.emit("global message", `/text-red-500 ${socket.nickname} left the chat, total: ${io.engine.clientsCount}`);
    io.emit("user disconnected", {
      nickname: socket.nickname,
      id: socket.id,
    });
  });
});

// Express routes
app.get("/api/users", async (req, res) => {
  const sockets = await io.fetchSockets();
  const users = sockets.map((socket) => {
    return {
      nickname: socket.nickname,
      id: socket.id,
      messages: [],
    };
  });
  res.status(200).json(users);
});

// Global error handler
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send("Something went wrong");
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}...`);
});

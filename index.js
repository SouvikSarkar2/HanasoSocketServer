const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("User Connected ", socket.id);

  socket.on("joinChatRoom", (roomId) => {
    socket.join(roomId);
    console.log(`user with ID ${socket.id} joined Room ${roomId}`);
    socket.on("disconnect", () => {
      console.log(`user ${socket.id} Disconnected from room ${roomId} `);
    });
  });
  socket.on("sendMessage", (data) => {
    socket.to(data.conversationId).emit("receiveMessage", data);
    console.log("data :", data);
  });

  socket.on("disconnect", () => {
    console.log("user Disconnected ", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Server Running ...");
});

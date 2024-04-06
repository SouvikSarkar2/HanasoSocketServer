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

let onlineUsers = [];
let onlineWithLastSeen = [];

io.on("connection", (socket) => {
  console.log("User Connected ", socket.id);

  socket.on("offline", (data) => {
    const updatedOnlineWithLastSeen = onlineWithLastSeen.map((user) => {
      if (user.userId === data.userId) {
        return { userId: data.userId, time: data.time };
      }
      return user;
    });
    console.log(updatedOnlineWithLastSeen);
    onlineWithLastSeen = updatedOnlineWithLastSeen;
  });

  socket.on("online", ({ userId, userName }) => {
    socket.join("online");
    if (!onlineUsers.includes(userId)) {
      onlineUsers.push(userId);
    }
    console.log(`${userName} is Online `);
    const data = {
      userId,
      userName,
    };
    io.to("online").emit("onlineCheck", onlineUsers);
    io.to("online").emit("offlineCheck", onlineWithLastSeen);
    console.log(onlineWithLastSeen);
  });
  socket.on("friendChanged", (userId) => {
    socket.to("online").emit("friendChanges", userId);
  });
  socket.on("joinChatRoom", (roomId) => {
    socket.join(roomId);
    console.log(`user with ID ${socket.id} joined Room ${roomId}`);
    socket.to(roomId).emit("statusCheck", { status: "online", roomId });
    socket.on("disconnect", () => {
      console.log(`user ${socket.id} Disconnected from room ${roomId} `);
    });
  });
  socket.on("sendMessage", (data) => {
    socket.to(data.conversationId).emit("receiveMessage", data);
    console.log("data :", data);
  });

  socket.on("status", (data) => {
    console.log(data.status);
    socket.to(data.roomId).emit("statusCheck", data);
  });

  socket.on("disconnect", () => {
    console.log("user Disconnected ", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Server Running ...");
});

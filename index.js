const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const Redis = require("ioredis");
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

let onlineUsers = [];
let onlineWithLastSeen = [];

redis.get("offline", (err, result) => {
  if (err) {
    console.error(err);
  } else {
    console.log(result);
    onlineWithLastSeen = JSON.parse(result || "[]");

    io.on("connection", (socket) => {
      console.log("User Connected ", socket.id);

      socket.on("online", ({ userId, userName }) => {
        socket.join("online");
        if (!onlineUsers.includes(userId)) {
          onlineUsers.push(userId);
        }
        console.log(`${userName} is Online `);

        io.to("online").emit("onlineCheck", onlineUsers);
        io.to("online").emit("offlineCheck", onlineWithLastSeen);

        socket.on("disconnect", () => {
          let present = false;
          const updatedOnlineWithLastSeen = onlineWithLastSeen.map((user) => {
            if (user.userId === userId) {
              present = true;
              return { userId: userId, time: Date.now() };
            }
            return user;
          });
          if (!present) {
            updatedOnlineWithLastSeen.push({
              userId: userId,
              time: Date.now(),
            });
          }
          onlineWithLastSeen = updatedOnlineWithLastSeen;
          const updatedOnlineUsers = onlineUsers.filter((user) => {
            return user !== userId;
          });
          onlineUsers = updatedOnlineUsers;

          io.to("online").emit("onlineCheck", onlineUsers);
          io.to("online").emit("offlineCheck", onlineWithLastSeen);
          console.log(`${userName} is Offline`);
          redis.set("offline", JSON.stringify(updatedOnlineWithLastSeen));
        });
      });
      socket.on("friendChanged", (userId) => {
        socket.to("online").emit("friendChanges", userId);
      });
      socket.on("joinChatRoom", async (roomId) => {
        socket.join(roomId);

        console.log(`user with ID ${socket.id} joined Room ${roomId}`);
        socket.to(roomId).emit("statusCheck", { status: "online", roomId });
        socket.on("disconnect", () => {
          console.log(`user ${socket.id} Disconnected from room ${roomId} `);
        });
      });
      socket.on("sendMessage", (data) => {
        socket.to(data.conversationId).emit("receiveMessage", data);
        io.to(data.conversationId).emit("receiveLastMessage", data);
        console.log("data :", data);
      });

      socket.on("status", (data) => {
        socket.to(data.roomId).emit("statusCheck", data);
      });

      socket.on("disconnect", () => {
        console.log("user Disconnected ", socket.id);
      });
    });
  }
});

server.listen(3001, () => {
  console.log("Server Running ...");
});

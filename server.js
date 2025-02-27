const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const users = new Map(); // Store username -> socket mapping
const friendRequests = new Map(); // Store pending friend requests
io.on("connection", (socket) => {
  const username = socket.handshake.auth.username;
  console.log("User connected:", username);

  users.set(username, socket);
  io.emit("update users", Array.from(users.keys()));

  const userAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`;
  io.emit("user joined", { id: username, avatar: userAvatar });

  // Friend request handling
  socket.on("friend request", (request) => {
    const targetSocket = users.get(request.to);
    if (targetSocket) {
      targetSocket.emit("friend request received", {
        from: request.from,
        to: request.to,
      });
    }
  });

  socket.on("friend request response", (response) => {
    const requesterSocket = users.get(response.to);
    const responderSocket = users.get(response.from);

    if (response.accepted) {
      // Notify both users about the new friendship
      if (requesterSocket) {
        requesterSocket.emit("friendship established", {
          friend: response.from,
          accepted: true,
        });
      }
      if (responderSocket) {
        responderSocket.emit("friendship established", {
          friend: response.to,
          accepted: true,
        });
      }
    }
  });

  socket.on("remove friend", (data) => {
    const targetSocket = users.get(data.to);
    if (targetSocket) {
      targetSocket.emit("friend removed", {
        from: data.from,
      });
    }
  });

  // Handle toast notifications
  socket.on("toast notification", (data) => {
    const targetSocket = users.get(data.to);
    if (targetSocket) {
      targetSocket.emit("toast notification", data);
    }
  });

  // Existing socket events
  socket.on("typing", (username) => {
    socket.broadcast.emit("user typing", username);
  });

  socket.on("stop typing", (username) => {
    socket.broadcast.emit("user stopped typing", username);
  });

  socket.on("general message", (msg) => {
    io.emit("general message", msg);
  });

  socket.on("edit message", (editedMessage) => {
    io.emit("message edited", editedMessage);
  });

  socket.on("delete message", (messageId) => {
    io.emit("message deleted", messageId);
  });

  socket.on("image message", (msg) => {
    io.emit("general message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", username);
    users.delete(username);
    io.emit("update users", Array.from(users.keys()));
  });
});

const PORT = 3001;
server.listen(PORT, "192.103.1.54", () => {
  console.log(`Server is running on http://192.103.1.54:${PORT}`);
});

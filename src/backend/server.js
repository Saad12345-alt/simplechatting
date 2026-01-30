const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Message = require("./roommsg")
const mongoose = require('mongoose')
const fs = require('fs');
const path = require('path');


const app = express();
app.use(cors());
app.use(express.json());

// Ensure the uploads directory exists (prevents write errors)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

mongoose.connect("mongodb://127.0.0.1:27017/chatapp");


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // your React app
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // send_file supports acknowledgement callback: socket.emit('send_file', data, (res) => { ... })
  socket.on("send_file", async (data, callback) => {
    console.log(`send_file from ${socket.id}:`, data.fileName, data.fileType, data.room);

    try {
    const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

if (!data.fileType || !(data.fileType.startsWith("image/") || allowedTypes.includes(data.fileType))) {
  return socket.emit("file_upload_error", {
    message: "File type not allowed",
    fileName: data.fileName,
  });
}
      if (!data.fileBuffer) {
        const err = { error: "No file data provided" };
        if (callback) return callback(err);
        return socket.emit("file_upload_error", { message: "No file data provided", fileName: data.fileName });
      }

      const base64Data = data.fileBuffer.split(";base64,").pop();
      const byteSize = Buffer.byteLength(base64Data, 'base64');
      if (byteSize > 5 * 1024 * 1024) {
        const err = { error: "File too large" };
        if (callback) return callback(err);
        return socket.emit("file_upload_error", { message: "File too large", fileName: data.fileName });
      }

      const fileNameOnDisk = `${Date.now()}-${data.fileName}`;
      const uploadPath = path.join(__dirname, "uploads", fileNameOnDisk);

      // write using promises
      await fs.promises.writeFile(uploadPath, base64Data, { encoding: "base64" });

      const newMessage = new Message({
        room: data.room,
        username: data.username,
        text: data.text || "",
        fileName: data.fileName,
        filePath: `/uploads/${fileNameOnDisk}`,
        fileType: data.fileType,
        isFile: true,
      });

      const saved = await newMessage.save();

      io.to(data.room).emit("receive_file", saved);

      if (callback) return callback({ success: true, message: saved });
    } catch (err) {
      console.error("send_file error:", err);
      if (callback) return callback({ error: err.message });
      socket.emit("file_upload_error", { message: err.message, fileName: data?.fileName });
    }
  });

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });

socket.on("send_message", async (data, callback) => {
  try {
    const newMessage = new Message({
      room: data.room,
      username: data.username,
      text: data.text,
      isFile: false,
    });

    const saved = await newMessage.save();

    io.to(data.room).emit("receive_message", saved);

    if (callback) return callback({ success: true, message: saved });
  } catch (err) {
    console.error("send_message error:", err);
    if (callback) return callback({ error: err.message });
  }
});

  socket.on("disconnect", () => {
    console.log("User has Disconnected", socket.id);
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/messages/:room', async(req,res) =>
{
  const {room} = req.params;
  try {
    const messages = await Message.find({room}).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages for room', room, err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
})
server.listen(3001, () => {
  console.log("Server running on port 3001");
});
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Message = require("./roommsg")
const mongoose = require('mongoose')

const app = express();
app.use(cors());

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

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });

socket.on("send_message", async (data) => {
  console.log("Message received:", data);

  const newMessage = new Message({
    room: data.room,
    username: data.username,
    text: data.text,
  });

  await newMessage.save();

  socket.to(data.room).emit("receive_message", data);
});
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get('/messages/:room', async(req,res) =>
{
  const {room} = req.params;
  const message = await Message.find({room}).sort({timestamp: 1})
  res.json(message)
})
server.listen(3001, () => {
  console.log("Server running on port 3001");
});
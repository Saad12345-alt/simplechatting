const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: String,
  username: String,
  text: String,
}, { timestamps: true }); // <-- this auto-adds createdAt & updatedAt

const Roommsg = mongoose.model("Message", messageSchema);

module.exports = Roommsg
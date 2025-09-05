import './index.css';
import React, { useState, useEffect } from 'react';
import { io } from "socket.io-client";

const socket = io("http://localhost:3001"); // connect once

function App() {
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState('');
  const [chat, setChat] = useState([]);
  const [showChat, setShowChat] = useState(false);

  const joinRoom = () => {
    if (room !== "") {
      socket.emit("join_room", room);
      setShowChat(true);
    }
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      console.log("Message received:", data);
      setChat((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim() !== "") {
      const messageContent = {
        room,
        username,
        text: message,
      };
      socket.emit("send_message", messageContent);
      setChat((prev) => [...prev, messageContent]);
      setMessage("");
    }
  };

  return (
<div className="chat-app">
  {!showChat ? (
    <div className="join-container">
      <h2>Join a Room</h2>
      <input
        type="text"
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="text"
        placeholder="Room ID"
        onChange={(e) => setRoom(e.target.value)}
      />
      <button onClick={joinRoom}>Join Room</button>
    </div>
  ) : (
    <div className="chat-container">
      <div className="messages">
        {chat.map((msg, i) => (
          <div key={i} className="message">
            <b>{msg.username}:</b> {msg.text}
          </div>
        ))}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={message}
          placeholder="Type your message..."
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )}
</div>
  );
}

export default App;
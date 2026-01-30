import './index.css';
import React, { useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";

const socket = io("http://localhost:3001"); // connect once

function App() {
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState('');
  const [chat, setChat] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [file, setFile] = useState(null);

  const joinRoom = () => {
    if (room !== "") {
      socket.emit("join_room", room);
      const running = async () =>
      {
        try{
      const res = await fetch(`http://localhost:3001/messages/${room}`)
      const data = await res.json();
      setChat(data);
      }
      catch(error) 
      {
        console.log("error has occured connecting to backend")
      }
    }
      running();
      setShowChat(true);
    }
  };

  const messagesRef = useRef(null);

  useEffect(() => {
    // Add messages only if they don't already exist (dedupe by _id)
    socket.on("receive_message", (data) => {
      console.log("Message received:", data);
      setChat((prev) => (prev.some(m => m._id === data._id) ? prev : [...prev, data]));
    });

    socket.on("receive_file", (data) => {
      console.log("File message received:", data);
      setChat((prev) => (prev.some(m => m._id === data._id) ? prev : [...prev, data]));
    });

    socket.on("file_upload_error", (err) => {
      console.error("File upload error from server:", err);
      alert(err.message || "File upload failed");
    });

    return () => {
      socket.off("receive_message");
      socket.off("receive_file");
      socket.off("file_upload_error");
    };
  }, []);

  // Auto-scroll to bottom whenever chat updates
  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      // smooth scroll to show newest message
      el.scrollTop = el.scrollHeight;
    }
  }, [chat]);

const handleSend = () => {
  if (file) {
    sendFile(); // file + optional text
  } else if (message.trim() !== "") {
    sendMessage(); // text only
  }
};


const sendMessage = () => {
  const payload = { room, username, text: message };

  socket.emit("send_message", payload, (res) => {
    if (res && res.error) {
      console.error("send_message error:", res.error);
      alert("Message failed to send: " + res.error);
      return;
    }

    // Add immediately (server will also emit to other clients)
    const saved = res && res.message ? res.message : null;
    if (saved) {
      setChat(prev => (prev.some(m => m._id === saved._id) ? prev : [...prev, saved]));
    }

    setMessage("");
  });
};


const sendFile = () => {
  const reader = new FileReader();

  if (file.size > 5 * 1024 * 1024) {
    alert("File too large (max 5MB)");
    setFile(null);
    return;
  }

  reader.onload = () => {
    const payload = {
      room,
      username,
      text: message,          // ✅ caption
      fileName: file.name,
      fileType: file.type,
      fileBuffer: reader.result,
    };

    socket.emit("send_file", payload, (res) => {
      if (res && res.error) {
        console.error("send_file error:", res.error);
        alert("File upload failed: " + res.error);
        return;
      }

      // saved message returned in ack
      const saved = res && res.message ? res.message : null;
      if (saved) {
        setChat(prev => (prev.some(m => m._id === saved._id) ? prev : [...prev, saved]));
      }

      setMessage("");
      setFile(null);
    });
  };

  reader.readAsDataURL(file);
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
      <div ref={messagesRef} className="messages">
        {chat.map((msg, i) => (
         <div key={msg._id || i} className="message">
  <b>{msg.username}:</b>

  {msg.isFile && (
    <>
      <div>
        <a
          href={`http://localhost:3001${msg.filePath}`}
          target="_blank"
          rel="noreferrer"
        >
          📎 {msg.fileName}
        </a>
      </div>

      {msg.text && <div className="caption">{msg.text}</div>}
    </>
  )}

  {!msg.isFile && msg.text}
</div>
                ))}
      </div>
      <div className="input-container">
        <input
        type="text"
        value={message}
        placeholder="Type your message..."
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <input type="file" 
        onChange={(e) => setFile(e.target.files[0])}
        onKeyDown={(e) => e.key === "Enter" && handleSend()} 
        />
        {file && <div className="selected-file">Selected: {file.name}</div> }
        <button disabled={!message && !file} onClick={handleSend}> Send </button>
      </div>
    </div>
  )}
</div>
  );
}

export default App;
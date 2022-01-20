const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const mongoose = require("mongoose");
const Message = require("./server/models/Message");
const Room = require("./server/models/Room");
const mongoDB = "mongodb://localhost:27017/conference";

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { json } = require("express/lib/response");
const { text, response } = require("express");
const moment = require("moment");
//console.log(moment().format("LT"));

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Set express
app.use(cookieParser());

app.use(function (req, res, next) {
  // check if client sent cookie
  var cookie = req.cookies.cookieName;
  if (cookie === undefined) {
    // no: set a new cookie
    var randomNumber = Math.random().toString();
    randomNumber = randomNumber.substring(2, randomNumber.length);
    res.cookie("cookieName", randomNumber, { maxAge: 900000, httpOnly: true });
    console.log("cookie created successfully");
  } else {
    // yes, cookie was already present
    console.log("cookie exists", cookie);
  }
  next(); // <-- important!
});

//Connect to mongo
mongoose
  .connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

const botName = "ChatBot";

// Run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, `Welcome ${user.username}`));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });

    // Get chats from mongo collection
    socket.on("fetchMessage", (room) => {
      Message.find(
        { room: Object.values(room) },
        "username text createdAt"
      ).then((messages) => {
        //console.log(messages);
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit("messageDB", messages);
      });
    });
  });

  // Save message to database
  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    const msgToStore = {
      username: user.username,
      room: user.room,
      text: msg,
    };
    const message = new Message(msgToStore);
    message.save().then((result) => {
      io.to(user.room).emit("message", formatMessage(user.username, msg));
    });
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });

  // Send room list to dropdown
  Room.find({}).then((roomName) => {
    let optionRoomName = [];
    const name = Object.values(roomName);
    name.map((value) => {
      optionRoomName.push(value.roomName);
    });
    socket.emit("createdRoom", { optionRoomName });
  });

  // Save room info to database
  socket.on("createRoom", (roomChat) => {
    const room = new Room({ roomName: roomChat });
    room.save().then((result) => {
      io.emit("room-created", result);
    });
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

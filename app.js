require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const sequelize = require('./util/database');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const User = require("./model/user")
const Chat = require('./model/chat');
const Group = require("./model/group");

const userRoute = require('./routes/user');
// const chatRoute = require('./routes/chat');


//user signup and login
app.use("/user", userRoute);

//chats
// app.use("/chat", chatRoute);

// Create an HTTP server for Socket.IO and Express
const server = http.createServer(app);

// Import the Socket.IO initialization function
// const { initializeSocket } = require('./socket');

// Initialize Socket.IO
// initializeSocket(server);

// User and Chat relationship
Chat.belongsTo(Group, { foreignKey: 'GroupId' });

Chat.belongsTo(User, { foreignKey: 'SenderId' });

User.belongsToMany(Group, { foreignKey: 'UserId' });

let runServer = async () => {
    try {
        // await sequelize.sync();
        console.log(`server started running at port ${process.env.PORT}`);
        server.listen(process.env.PORT || 3000);
    }
    catch (err) {
        console.log(err);
    }
}
runServer();

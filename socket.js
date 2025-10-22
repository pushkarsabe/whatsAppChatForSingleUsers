const socketIO = require('socket.io');

let io;

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: "*", // Allow all origins
        }
    });

    io.on('connection', (socket) => {
        console.log("User connected with socket id: ", socket.id);

        socket.on('join-group', (groupId) => {
            socket.join(groupId);
            console.log(`User with socket ID: ${socket.id} joined group: ${groupId}`);
        });

        socket.on('send-message', (message) => {
            console.log('message = ' + message);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
}

// Export the io instance and function to send messages
const sendMessageToGroup = (groupId, message) => {
    if (io) {
        io.to(groupId).emit('newMessage', message);
    }
};

module.exports = { initializeSocket, sendMessageToGroup };
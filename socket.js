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
            Object.keys(socket.rooms).forEach(room => {
                if (room !== socket.id) { // Don't leave the room named after their own socket ID
                    socket.leave(room);
                }
            });

            socket.join(groupId);
            console.log(`User with socket ID: ${socket.id} joined group: ${groupId}`);
        });

        socket.on('send-message', (message) => {
            console.log('Direct socket message received (API is preferred): ' + message);
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
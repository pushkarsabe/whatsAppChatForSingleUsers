const express = require('express');

const router = express.Router();

const userChatController = require('../controller/chat');

const userAuthorization = require('../middleware/auth');

//to post the user deatils
router.post('/add-chat', userAuthorization.authenticate, userChatController.postLoginAddChat);

// Route to get chats by groupId
router.get('/get-chat', userAuthorization.authenticate, userChatController.getChatsByGroup);

// Route to get chats by groupId
router.get('/add-file', userChatController.getChatsByGroup);

module.exports = router;    
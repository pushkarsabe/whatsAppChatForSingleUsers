
const express = require('express');

const router = express.Router();

const groupController = require('../controller/group');
const userAuthorization = require('../middleware/auth'); // Assuming this path is correct

// Route to get all groups/chats for the logged-in user (Sidebar list)
router.get('/get-data', userAuthorization.authenticate, groupController.getUsersGroups);

// Route to create a new one-on-one group (Friend request/start chat)
router.post('/create-one-on-one', userAuthorization.authenticate, groupController.createOneToOneGroup);

router.post('/accept-request', userAuthorization.authenticate, groupController.acceptFriendRequest);

router.post('/reject-request', userAuthorization.authenticate, groupController.rejectFriendRequest); 

module.exports = router;
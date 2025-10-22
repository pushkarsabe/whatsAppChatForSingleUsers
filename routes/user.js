const express = require('express');

const router = express.Router();

const auth = require('../middleware/auth');

const userController = require('../controller/user');

//to post the user deatils
router.post('/signup', userController.postAddSignup);

//to post the user deatils
router.post('/login', userController.postLogin);

//to post the user deatils
router.get('/user-data', auth.authenticate, userController.getData);

module.exports = router;
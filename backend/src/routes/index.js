const express = require('express');
const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');
const meetingController = require('../controllers/meetingController');
const userController = require('../controllers/userController');
const groupController = require('../controllers/groupController');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/chat/:roomId', authenticate, chatController.getMessages);
router.post('/chat/send', authenticate, chatController.sendMessage);
router.get('/user/search', authenticate, userController.search);
router.post('/meeting/create', authenticate, meetingController.create);
router.post('/meeting/join', authenticate, meetingController.join);
router.put('/user/update', authenticate, userController.update);
router.get('/group/list', authenticate, groupController.list);
router.post('/group/create', authenticate, groupController.create);
router.post('/group/addMember', authenticate, groupController.addMember);

module.exports = router;

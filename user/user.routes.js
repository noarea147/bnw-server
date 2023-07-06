const express = require('express');
const UserController = require('./user.controller');
const jwt = require('../middleware/jwt');

const router = express.Router();

router.post('/register', UserController.Register);
router.post('/login', UserController.Login);
router.post('/update', jwt.authenticateToken, UserController.Update);
router.post('/send-verification-sms', UserController.SendVerificationSMS);
router.post('/verify-account', jwt.authenticateToken, UserController.VerifyAccount);
router.post('/forgot-password', UserController.ForgotPassword);
router.post('/reset-password', UserController.ResetPassword);
module.exports = router;

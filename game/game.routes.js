const express = require('express');
const GameController = require('./game.controller');

const router = express.Router();
const jwt = require('../middleware/jwt');

router.post('/creategame', jwt.authenticateTokenAdmin, GameController.CreateGame);

router.post('/startgame', jwt.authenticateTokenAdmin, GameController.StartGame);

router.post('/closegame', jwt.authenticateTokenAdmin, GameController.CloseGame);

router.post('/participateingame', jwt.authenticateToken, GameController.ParticipateInGame);

router.post('/guestanswer', jwt.authenticateToken, GameController.GuestAnswer);

router.post('/hostanswer', jwt.authenticateTokenAdmin, GameController.HostAnswer);

router.get('/stats', GameController.GameStats);

router.get('/getgame', jwt.authenticateToken, GameController.GetGame);

router.post('/sendnotification', jwt.authenticateToken, GameController.SendNotification);

router.get('/lockanswers', jwt.authenticateTokenAdmin, GameController.LockAnswers);

module.exports = router;

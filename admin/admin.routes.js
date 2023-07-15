const express = require('express');
const GameController = require('../game/game.controller');

const router = express.Router();
const jwt = require('../middleware/jwt');

router.post('/login', GameController.CreateGame);


module.exports = router;

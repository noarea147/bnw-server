/* eslint no-console: "off", func-names: "off" */
const express = require('express');

const app = express();
const cors = require('cors');
const config = require('./config/database');

const port = process.env.PORT || 3000;

app.use(express.json());

app.use(cors());

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

config();

app.use('/user', require('./user/user.routes'));

app.use('/game', require('./game/game.routes'));

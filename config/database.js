/* eslint no-console: "off", func-names: "off" */
require('dotenv').config();
const mongoose = require('mongoose');

module.exports = function () {
  mongoose.connect(`${process.env.MONGO_URL}`, { useUnifiedTopology: true });
  mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
  }).on('error', (error) => {
    console.log('Connection error:', error);
  });
};

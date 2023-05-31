/* eslint no-console: "off", func-names: "off" */
const mongoose = require("mongoose");


require("dotenv").config();

module.exports = function () {
  const url = process.env.MONGO_DB_URL;
  mongoose.connect(url, { useUnifiedTopology: true });
  mongoose.connection
    .once("open", () => {
      console.log(
        `Connected to MongoDB [AUTH ENVIRONMENT]: ${process.env.NODE_ENV}`
      );
    })
    .on("error", (error) => {
      console.log("Connection error:", error);
    });
};

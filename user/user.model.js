const mongoose = require('mongoose');

const { Schema } = mongoose;
const userSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    password: String,
    phoneNumber: Number,
    state: String,
    birthday: Date,
    gender: {
      type: String,
      enum: ['male', 'female'],
    },
    role: {
      type: String,
      enum: ['admin', 'guest'],
      default: 'guest',
    },
    firebase_token: String,
    refresh_token: String,
    password_reset_code: Number,
    verified: {
      type: Boolean,
      default: false,
    },
    verificationKey: Number,
  },
  {
    timestamps: true,
  },
);
module.exports = mongoose.models.User || mongoose.model('User', userSchema);

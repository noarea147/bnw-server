const mongoose = require('mongoose');

const { Schema } = mongoose;
const adminSchema = new Schema(
  {
    password: String,
    phoneNumber: Number,
    email: String,
    verification_code: Number,
    role: {
      type: String,
      enum: ['admin', 'guest'],
      default: 'admin',
    },
  },
  {
    timestamps: true,
  },
);
module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

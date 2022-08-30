const mongoose = require('mongoose');

const { Schema } = mongoose;
const gameSchema = new Schema(
  {
    currentRound: [
      {
        player: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        answer: {
          type: String,
          enum: ['yes', 'no', 'no answer'],
        },
      },
    ],
    status: String,
    closed: Boolean,
    activeRound: Number,
    winners: [
      {
        firstName: String,
        lastName: String,
        phoneNumber: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
);
module.exports = mongoose.models.Game || mongoose.model('Game', gameSchema);

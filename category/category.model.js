const mongoose = require("mongoose");

const { Schema } = mongoose;
const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: String,
    icon: String,
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

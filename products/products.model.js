const mongoose = require("mongoose");

const { Schema } = mongoose;
const productsSchema = new Schema(
  {
    title: String,
    subtitle: String,
    description: String,
    specification: String,
    volumes: [
      {
        volume: String,
        price: String,
        status: {
          type: String,
          enum: ["inStock", "outOfStock"],
          default: "inStock",
        },
      },
    ],
    image: String,
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
  },
  {
    timestamps: true,
  }
);
module.exports =
  mongoose.models.Products || mongoose.model("Products", productsSchema);

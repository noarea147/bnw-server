const mongoose = require("mongoose");
const Products = require("./../products/products.model");

const dropCollection = async (collections) => {
  try {
    for (const collection of collections) {
      if (collection === "Products") {
        await Products.deleteMany({});
        console.log(`Cleaned collection: ${collection}`);
      }
    }
  } catch (err) {
    console.error("Error cleaning collections:", err);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed");
  }
};
const collections = process.argv.slice(2);
dropCollection(collections);

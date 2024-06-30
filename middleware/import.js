const mongoose = require("mongoose");
const csvtojson = require("csvtojson");
const fs = require("fs");
const path = require("path");
const ProductsModel = require("../products/products.model");
const config = require("../config/database");

const csvFilePath = path.join(__dirname, "statics", "carProductsData.csv");

config();
csvtojson()
  .fromFile(csvFilePath)
  .then(async (jsonObj) => {
    for (let item of jsonObj) {
      if (item.image) {
        const product = new ProductsModel({
          title: item.title,
          subtitle: item.subtitle,
          description: item.description,
          specification: item.specification,
          price: item.price,
          image: item.image,
        });
        console.log(product.title + " is successfully imported !");
        try {
          await product.save();
          console.log("Product saved:", product);
        } catch (err) {
          console.error("Error saving product:", err);
        }
      }
    }

    console.log("CSV data imported successfully");
  })
  .catch((err) => console.error("Error converting CSV to JSON:", err));

const express = require("express");
const ProductsController = require("./products.controller");
const jwt = require("../middleware/jwt");

const router = express.Router();

router.post("/getProducts", ProductsController.getProductsByOrFilters);
module.exports = router;

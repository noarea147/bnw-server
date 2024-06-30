require("dotenv").config();
const utils = require("../helpers/utils");
const productsModel = require("./products.model");

exports.getProductsByOrFilters = async (req, res) => {
  const { filters, model, limit, sortBy } = req.body;
  const searchResults = await utils.searchByOrFilters(
    filters,
    productsModel,
    limit,
    sortBy
  );
  res.status(searchResults.statusCode).json({
    message: searchResults.message,
    data: searchResults.results,
    status: searchResults.status,
  });
};

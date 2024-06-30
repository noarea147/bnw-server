const mongoose = require("mongoose");

exports.searchByOrFilters = async function (
  filters,
  model,
  limit = 10,
  sortBy,
  populate = []
) {
  if (!filters || filters.length === 0) {
    let objects = {};
    if (sortBy) {
      let field = sortBy.field;
      let sort = sortBy.sort;
      objects = await model?.find().sort({ field: sort }).limit(limit);
    } else {
      objects = await model?.find().sort({ updatedAt: -1 }).limit(limit);
    }
    return {
      status: "success",
      message: "fetched",
      results: objects,
      statusCode: 200,
    };
  }

  const { paths } = model.schema;
  let filtersValid = true;

  const formattedFilters = filters.map((filter) => {
    filtersValid = filtersValid && isValidFilter(paths, filter);
    return formatRegexFilter(filter);
  });

  if (filtersValid) {
    const objects = await model
      .find({ $or: formattedFilters })
      .limit(limit)
      .populate(populate);

    if (!objects || objects.length === 0) {
      return {
        status: "fail",
        message: "not found",
        results: null,
        statusCode: 404,
      };
    }

    return {
      status: "success",
      message: "fetched",
      results: objects,
      statusCode: 200,
    };
  } else {
    return {
      status: "fail",
      message: "invalid filters",
      results: null,
      statusCode: 400,
    };
  }
};

function isValidFilter(paths, filter) {
  const schemaAttributes = Object.keys(paths);
  const requestFilters = Object.keys(filter);
  return requestFilters.every((f) => schemaAttributes.includes(f));
}

function formatRegexFilter(filter) {
  const formattedFilter = {};
  for (const key in filter) {
    if (filter[key] instanceof RegExp) {
      formattedFilter[key] = filter[key];
    } else {
      formattedFilter[key] = new RegExp(filter[key], "i"); // 'i' for case-insensitive match
    }
  }
  return formattedFilter;
}

const fs = require("fs"); // Import the file system module
const path = require("path");

// Function to clean the data
function cleanData(data) {
  return data.map((row) => {
    // Replace multiple spaces and line breaks with a single space
    return row.map((cell) => cell.trim().replace(/\s+/g, "  "));
  });
}

// Load the data from the CSV file
const csvFilePath = path.join(__dirname, "statics", "carProductsData.csv");
const data = fs.readFileSync(csvFilePath, "utf-8").split("\n");

// Clean the data
const cleanedData = cleanData(data.map((row) => row.split(",")));

// Save the cleaned data to a new CSV file
fs.writeFileSync(csvFilePath, cleanedData.join("\n"));

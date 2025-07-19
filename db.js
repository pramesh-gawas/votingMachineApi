const mongoose = require("mongoose");
require("dotenv").config();
/* const mongoUrl = ""; */
const mongoUrl = process.env.DB_URL;

mongoose.connect(mongoUrl);

const db = mongoose.connection;

db.on("connected", () => {
  console.log("connected successfully");
});

db.on("disconnected", () => {
  console.log("disconnected from the mongodb");
});

db.on("error", (err) => {
  console.log("mongodb error" + err);
});

module.exports = db;

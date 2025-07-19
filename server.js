const express = require("express");
const app = express();
const db = require("./db");
require("dotenv").config();
const cors = require("cors");
const path = require("path");
// const bodyParser = require("body-parser");

PORT = 8000 || process.env.PORT;

app.use(cors());
app.use(express.json());
// app.use(bodyParser.json()); // req.body

const userRoutes = require("./routes/userRoutes");
const candidateRoutes = require("./routes/candidateRoutes");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/user", userRoutes);
app.use("/candidate", candidateRoutes);
app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

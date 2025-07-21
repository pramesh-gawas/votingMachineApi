const express = require("express");
const app = express();
const db = require("./db");
require("dotenv").config();
const cors = require("cors");
const path = require("path");

PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());

const userRoutes = require("./routes/userRoutes");
const candidateRoutes = require("./routes/candidateRoutes");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/user", userRoutes);
app.use("/candidate", candidateRoutes);
app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

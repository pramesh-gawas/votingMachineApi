const jwt = require("jsonwebtoken");
const jwtAuthMiddleWare = (req, res, next) => {
  //check for the authorization
  const authorization = req.headers.authorization;
  if (!authorization) return res.status(401).json({ error: "token not found" });

  //extract the jwt token frpm the request header
  const token = req.headers.authorization.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.SECREATE_KEY);

    //attach user information to the request object
    req.user = decoded;
    console.log("decoded", req.user);
    next();
  } catch (error) {
    res.status(401).json({ error: "invalid token" });
  }
};

//function to genearate token
const generateToken = (userData) => {
  //generate a new jwt token using user Data
  return jwt.sign(userData, process.env.SECREATE_KEY, {
    expiresIn: "24h",
  }); //
};

module.exports = { jwtAuthMiddleWare, generateToken };

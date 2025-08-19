const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  let token;
  token = req.cookies.token;
console.log(token);
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1]; 
  }
  if (!token) {
    return res.status(400).json({ message: "No token, Authorization denied!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token!" });
  }
};

module.exports = authMiddleware;

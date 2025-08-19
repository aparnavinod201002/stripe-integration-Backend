const fs = require('fs');
const mongoose = require('mongoose');
const connection_string = process.env.MONGO_URI;
  mongoose.connect(connection_string)
    .then(() => {
      console.log("Successfully connected to MongoDB Atlas");
    })
    .catch((err) => {
      console.log("MongoDB connection failed:", err);
    });

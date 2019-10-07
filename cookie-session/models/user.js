const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: String,
  password: String,
  salt: String,
  isAdmin: Boolean,
  age: Number
});

module.exports = mongoose.model("User", userSchema);

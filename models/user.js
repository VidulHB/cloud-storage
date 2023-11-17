const mongoose = require("mongoose");
const Schema = mongoose.Schema;

(acuserSchema = new Schema({
  username: String,
  password: String,
  admin: Boolean
})),
  (acusers = mongoose.model("acuser", acuserSchema));

module.exports = acusers;

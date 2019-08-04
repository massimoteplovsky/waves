const mongoose = require("mongoose");

const woodSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100,
    unique: 1
  },
});

var Woods = mongoose.model('Woods', woodSchema);

module.exports = { Woods };

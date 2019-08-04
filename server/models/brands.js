const mongoose = require("mongoose");

const brandSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100,
    unique: 1
  },
});

var Brands = mongoose.model('Brands', brandSchema);

module.exports = { Brands };

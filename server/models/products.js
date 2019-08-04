const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 100000
  },
  price: {
    type: Number,
    required: true,
    maxlength: 255
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: "Brands",
    required: true
  },
  wood: {
    type: Schema.Types.ObjectId,
    ref: "Woods",
    required: true
  },
  shipping: {
    type: Boolean,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    maxlength: 255,
    min: 0
  },
  frets: {
    type: Number,
    required: true
  },
  sold: {
    type: Number,
    maxlength: 255,
    default: 0,
    min: 0
  },
  publish: {
    type: Boolean,
    required: true
  },
  images: {
    type: Array,
    default: []
  }
}, {timestamps: true});

var Products = mongoose.model('Products', productSchema);

module.exports = { Products };

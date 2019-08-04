const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  user: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    lastname: {
      type: String,
      required: true
    }
  },
  orderDetails: {
    items: {
      type: Array,
      required: true
    },
    totalPrice: {
      type: String,
      required: true
    },
    date:{
      type: Number,
      required: true
    }
  },
  status: {
    type: String,
    default: "process",
    required: true
  }

}, {timestamps: true});

var Orders = mongoose.model('Orders', orderSchema);

module.exports = { Orders };

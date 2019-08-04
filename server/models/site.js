const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const siteInfoSchema = new Schema({

  adress: {
    type: String,
    required: true
  },
  hours: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  }

});

var SiteInfo = mongoose.model('SiteInfo', siteInfoSchema);

module.exports = { SiteInfo };

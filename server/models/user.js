const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const moment = require("moment");
const token = require('jsonwebtoken');
require("dotenv").config();

const userSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    unique: 1
  },
  password: {
    type: String,
    required: true,
    minlength: 5
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  lastname: {
    type: String,
    required: true,
    maxlength: 100
  },
  cart:{
    type: Array,
    default: []
  },
  history:{
    type: Array,
    default: []
  },
  role:{
    type: Number,
    default: 0
  },
  token:{
    type: String
  },
  resetToken:{
    type: String
  },
  resetTokenExp:{
    type: Number
  }
});

userSchema.pre("save", function(next){
  var user = this;

  if(user.isModified("password")){
    bcrypt.genSalt(10, function(err, salt){
      if(err) return next(err);

      bcrypt.hash(user.password, salt, function(err, hash){
        if(err) return next(err);
        user.password = hash;
        next();
      });
    })
  } else {
    next();
  }
});

//Schema method compare passwords: initial and inside DB
userSchema.methods.comparePasswords = function(userPassword, cb){
  bcrypt.compare(userPassword, this.password, function(err, isMatch) {
    if(err) return cb(err);
    cb(null, isMatch)
  });
}

//Generate user token
userSchema.methods.generateToken = function(cb){
  const user = this;

  const userToken = token.sign(user._id.toHexString(), process.env.SECRET);
  user.token = userToken;

  user.save(function(err, user){
    if(err) return cb(err);
    cb(null, user);
  })
}

//Generate user reset token
userSchema.methods.generateResetToken = function(cb){
  const user = this;
  const today = moment().startOf("day").valueOf();
  const tommorow = moment(today).endOf("day").valueOf();

  const userToken = token.sign(user._id.toHexString(), process.env.SECRET);
  user.resetToken = userToken;
  user.resetTokenExp = tommorow;

  user.save(function(err, user){
    if(err) return cb(err);
    cb(null, user);
  })
}

//Find user token
userSchema.statics.findByResetToken = function(userResetToken, cb){
  const user = this;

  token.verify(userResetToken, process.env.SECRET, function(err, decode){

    user.findOne({"_id": decode, "resetToken": userResetToken}, function(err, user){
      if(err) return cb(err);
      if(moment().isBefore(user.resetTokenExp)){
        cb(null, user);
      } else {
        cb(err);
      }
    })
  })
}

//Find user token
userSchema.statics.findByToken = function(userToken, cb){
  const user = this;

  token.verify(userToken, process.env.SECRET, function(err, decode){
    user.findOne({"_id": decode, "token": userToken}, function(err, user){
      if(err) return cb(err);
      cb(null, user);
    })
  })
}

var User = mongoose.model('User', userSchema);

module.exports = { User };

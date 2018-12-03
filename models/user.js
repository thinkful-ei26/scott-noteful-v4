'use strict';


const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: {type: String, default: ''},
  username: {type: String, required: true, unique: true},
  password: {type: String, required: true}
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, result) => {
    delete result._id;
    delete result.__v;
    delete result.password;
  }
});

userSchema.methods.validatePassword = function (incomingPassword) {
  const user = this; // for clarity
  return incomingPassword === user.password;
};

const User = mongoose.model('User', userSchema);
module.exports = User;

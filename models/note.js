'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  title: {type: String, required: true},
  content: String,
  folderId: {type: mongoose.Schema.Types.ObjectId, ref: 'Folder'},
  tags: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tag'}],
  userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true}
});

// Add `createdAt` and `updatedAt` fields
schema.set('timestamps', true);

// Transform output during `res.json(data)`, `console.log(data)` etc.
schema.set('toObject', {
  virtuals: true,
  transform: (doc, result) => {
    delete result._id;
    delete result.__v;
  }
});

module.exports = mongoose.model('Note', schema);

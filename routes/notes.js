'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const Note = require('../models/note');
const Folder = require("../models/folder");
const Tag = require("../models/folder");
const router = express.Router();

// Protect endpoints using JWT Strategy
router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

function folderValid(folderId, userId) {
  if (folderId === undefined) {
    return Promise.resolve();
  }
  if (folderId === ''){
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
  return Folder.countDocuments({_id: folderId, userId})
    .then(result => {
      if (result === 0) {
        const err = new Error('The `folderId` is not valid');
        err.status = 400;
        return Promise.reject(err);
      }
    });
}

function tagValid(tags, userId) {
  if (tags === undefined) {
    return Promise.resolve();
  }

  if (!Array.isArray(tags)) {
    const err = new Error('The `tags` prop must be array');
    err.status = 400;
    return Promise.reject(err);
  }

  const invalidIds = tags.filter(tag => !mongoose.Types.ObjectId.isValid(tag));
  if (invalidIds.length) {
    const err = new Error('The `tags` array has a tag that is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
  return Tag.countDocuments({
    $and: [
      {
        _id: {$in: tags},
        userId
      }
    ]
  })
    .then(count => {
      if (tags.length !== count.length){
        const err = new Error('The `tags` array has a tag that is not valid');
        err.status = 400;
        return Promise.reject(err);
      }
    });
}



/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId  } = req.query;
  const userId = req.user.id;

  let filter = {userId};

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({_id: id, userId})
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags } = req.body;
  const userId = req.user.id;
  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }





  const newNote = { title, content, folderId, tags, userId };
  if (newNote.folderId === '') {
    delete newNote.folderId;
  }

  Promise.all([
    folderValid(newNote.folderId, userId),
    tagValid(newNote.tags, userId)
  ]).then(() => Note.create(newNote))
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const toUpdate = {};
  const updateableFields = ['title', 'content', 'folderId', 'tags'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  // if (toUpdate.folderId && !mongoose.Types.ObjectId.isValid(toUpdate.folderId)) {
  //   const err = new Error('The `folderId` is not valid');
  //   err.status = 400;
  //   return next(err);
  // }

  // if (toUpdate.tags) {
  //   const badIds = toUpdate.tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
  //   if (badIds.length) {
  //     const err = new Error('The `tags` array contains an invalid `id`');
  //     err.status = 400;
  //     return next(err);
  //   }
  // }

  if (toUpdate.folderId === '') {
    delete toUpdate.folderId;
    toUpdate.$unset = {folderId : 1};
  }
  Promise.all([
    folderValid(toUpdate.folderId, userId),
    tagValid(toUpdate.tags, userId)
  ]).then(Note.findOneAndUpdate({_id: id, userId}, toUpdate, { new: true }))
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOneAndDelete({_id: id, userId})
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;

"use strict";
const express = require("express");
const User = require("../models/user");
const router = express.Router();

router.post("/", (req, res, next) => {


  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {

    const err = new Error(`Missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }

  const stringFields = ["fullname", "username", "password"];
  const nonStringField = stringFields.find(field => {
    return field in req.body && typeof req.body[field] !== "string";
  });

  if (nonStringField) {
    const err = new Error(`${nonStringField} must be a string.`);
    err.status = 422;
    return next(err);
  }

  const explicityTrimmedFields = ['username', 'password'];
  const nonTrimmedField = explicityTrimmedFields.find(field => {
    return req.body[field].trim() !== req.body[field];
  });

  if (nonTrimmedField) {
    const err = new Error(`${nonTrimmedField} cannot start or end with a space.`);
    err.status = 422;
    return next(err);
  }

  const sizedFields = {
    username: {
      min: 1
    },
    password: {
      min: 8,
      max: 72
    }
  };

  const tooSmallField = Object.keys(sizedFields).find(field => {
    return 'min' in sizedFields[field] &&
    req.body[field].trim().length < sizedFields[field].min;
  });
  const tooLargeField = Object.keys(sizedFields).find(field => {
    return 'max' in sizedFields[field] &&
    req.body[field].trim().length > sizedFields[field].max;
  });

  if (tooSmallField) {
    const min = sizedFields[tooSmallField].min;
    const err = new Error(`${tooSmallField} must be at least ${min} characters long.`);
    err.status = 422;
    return next(err);
  }

  if (tooLargeField) {
    const err = new Error(`${tooLargeField} must be mo more than 72 characters long.`);
    err.status = 422;
    return next(err);
  }

  const { fullname = '', username, password } = req.body;


  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return User.create(newUser);
    })
    .then(result => {
      return res.status(201).location(`/api/users/${result.id}`).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;

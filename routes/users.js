"use strict";
const express = require("express");
const User = require("../models/user");
const router = express.Router();

router.post("/", (req, res, next) => {
  const {fullname, username, password} = req.body;
  const newUser = {fullname, username, password};


  User.create(newUser)
    .then(result =>{
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
  
    .catch(e => next(e));
});

module.exports = router;

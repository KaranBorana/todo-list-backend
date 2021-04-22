const jwt = require('jsonwebtoken');
const { User } = require('../db/models/user.model');

// check whether the request has a valid JWT token
let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');
    
    // verify the JWT
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
           // there was an error
            // jwt is invalid - * DO NOT AUTHTENTICATE *
            res.status(401).send(err);
        } else {
            // jwt is valid
            req.user_id = decoded._id;
            next();
       } 
    });
}

module.exports = { authenticate };
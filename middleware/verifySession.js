const { User } = require('../db/models/user.model');
const bodyParser = require('body-parser');
const express = require('express');

// Verify Refresh Token MIDDLEWARE
// Purpose: which will be verifying the session
let verifySession = function (req, res, next) {
   // grab the refresh token from the header
    let refreshToken = req.header('x-refresh-token');
    
    // grab the _id from the refresh token
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // user couldn't be found
            return Promise.reject({
                'error': 'User not found.'
            });
        }

        /**
         *  If the code reaches here - user was found.
         *  Therefor the refresh token exits in the database but 
         *  we still have to check if has expired or not.
         */

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check if the session has expired
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // session token has not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is valid. call next() to 
            // continue with the web request.
            next();
        } else {
            // session is not valid
            return Promise.reject({
                'error': 'Refresh token has expired or the token is invalid'
            });
        }
    }).catch((e) => {
        res.status(401).send(e); 
    });
}

module.exports = { verifySession };
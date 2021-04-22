const express = require('express');
const bodyParser = require('body-parser');
const { mongoose } = require('./db/mongoose');
const jwt = require('jsonwebtoken');
const app = express();

const { List } = require('./db/models/list.model');
const { Task } = require('./db/models/task.model');
const { User } = require('./db/models/user.model');


const { verifySession } = require('./middleware/verifySession');
// const { authenticate } = require('./middleware/authenticate');
const e = require('express');

/* MIDDLEWARE */

app.use(bodyParser.json());

// CORS HEADERS MIDDLEWARE
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods","GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept,x-access-token, x-refresh-token, _id");
    res.header("Access-Control-Expose-Headers", 'x-access-token, x-refresh-token, _id');
    next();
});

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

/* END OF MIDDLEWARE */

app.get('/', (req, res) => {
    res.send("Hello World!");
});

/**
 *  GET /lists
 *  Puropse: Get all the list
 */
app.get('/lists', authenticate, (req, res) => {
    /**
     *  We want to return an array of all 
     *  the lists that belong to the 
     *  authenticated user
     */
    List.find({
        _userId: req.user_id
    }).then((lists) => {
        res.send(lists);
    }); 
});

app.post('/lists', authenticate, (req, res) => {
    let title = req.body.title; 
    let newList = new List({
        title,
        _userId: req.user_id
    });
    newList.save().then((listDoc) => {
        res.send(listDoc);
    }).catch((e) => {
        console.log(e); 
    });
});

app.patch('/lists/:id', authenticate, (req, res) => {
    List.findOneAndUpdate({
        _id: req.params.id,
        _userId: req.user_id
    }, {
        $set: req.body
    }).then(() => {
        res.send({'message':'Updated Successfully'});
    }); 
});

app.delete('/lists/:id', authenticate, (req, res) => {
    List.findOneAndDelete({
        _id: req.params.id,
        _userId: req.user_id
    }).then((removedList) => {
        console.log(removedList);
        res.send(removedList);

        // delete all the tasks that are in the deleted list
        deleteTaskFromList(removedList._id);
    }); 
}); 

app.get('/lists/:listId/tasks', authenticate, (req, res) => {
    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    }) 
});

app.post('/lists/:listId/tasks', authenticate, (req, res) => {
    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            /**
             *  List object is valid therefore
             *  the currently authenticated user 
             *  can create tasks
             */
            return true;
        }
        // else - list object is undefined
        return false
    }).then((boolCanCreateTask) => {
        if (boolCanCreateTask) {
            let newTask = new Task({
                title: req.body.title,
                _listId: req.params.listId
            });
            newTask.save().then((newTaskDoc) => {
                res.send(newTaskDoc);
            });
        } else {
            res.sendStatus(404);
        }
    }).catch((e) => {
        console.log(e); 
    });
});

app.patch('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {

    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            /**
             *  List object is valid therefore
             *  the currently authenticated user 
             *  can make updates to the tasks
             *  within this list
             */
            return true;
        }
        // else - list object is undefined
        return false
    }).then((boolCanUpdateTask) => {
        if (boolCanUpdateTask) {
            // current authenticated user can 
            // update the tasks
            Task.findOneAndUpdate({
                _id: req.params.taskId,
                _listId: req.params.listId
            }, {
                $set: req.body
            }).then(() => {
                res.send({ message: "Updated Successfully!" });
            });
        } else {
            res.sendStatus(404);
        }
    }).catch((e) => {
        console.log(e); 
    });
});

app.delete('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {
    List.findOne({
        _id: req.params.listId,
        _userId: req.user_id
    }).then((list) => {
        if (list) {
            /**
             *  List object is valid therefore
             *  the currently authenticated user 
             *  can delete the tasks
             *  within this list
             */
            return true;
        }
        // else - list object is undefined
        return false
    }).then((boolCanDeleteTask) => {
        if (boolCanDeleteTask) {
            // current authenticated user can 
            // update the tasks
            Task.findOneAndRemove({
                _id: req.params.taskId,
                _listId: req.params.listId
            }).then((removedTaskDoc) => {
                res.send(removedTaskDoc);
            });
        } else {
            res.sendStatus(404);
        }
    }).catch((e) => {
        console.log(e); 
    }); 
});


// *** USER ROUTES ***

/**
 * POST /users
 * Purpose: SignUp
 */
app.post('/users/signup', (req, res) => {
   // User signs up
    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // Session created successfully. refreshToken returned.
        // Now we generate an access auth token for the user.

        return newUser.generateAccessAuthToken().then((accessToken) => {
           // access auth token generated successfully.
           // now we return an object containing the auth token
            return { accessToken, refreshToken };
        });
    }).then((authTokens) => {
        
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
});

/**
 * POST /users/login
 * Purpose: Login 
 */
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // Session created successfully. refreshToken returned.
            // Now we generate an access auth token for the user.

            return user.generateAccessAuthToken().then((accessToken) => {
                // access auth token generated successfully.
                // now we return an object containing the auth token
                return { accessToken, refreshToken };
            })
        }).then((authTokens) => {
             
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).status(e);
    })
});

/**
 * GET /users/me/access-token
 * Purpose: Generates and returns an access token
 */
app.get('/users/me/access-token', verifySession, (req, res) => {
    // Now we know that user is authenticated and we have
    // the user_id and user object available with us.
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e); 
    });
});

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
})


let deleteTaskFromList = (_listId) => {
    Task.deleteMany({ _listId }).then(() => {
        console.log("Task deleted"); 
    });
}


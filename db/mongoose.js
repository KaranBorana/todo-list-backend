const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/TaskManager', {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB sucessfully!");
}).catch((e) => {
    console.log("Error while connecting to MongoDB");
    console.log(e);
});

module.exports = { mongoose };
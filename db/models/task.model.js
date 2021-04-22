const mongoose = require('mongoose');

const TaskSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    _listId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    }
});

const Task = mongoose.model('Task', TaskSchema);

// *** HELPER METHOD ***
// Purpose: delete all the task from a particular list
TaskSchema.statics.deleteTaskFromList = function (_listId) {
    Task.deleteMany({ _listId }, (err) => {
        console.log(err);
    });
        
    
}

module.exports = { Task };
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email : {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required:true
    },
    birthdate: {
        type: Date,
        required:true
    },
    gender: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    full_name: {
        type: String,
        required: true,
    },
    active: {
        type: Boolean,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        required: true,
    }

});

userSchema.plugin(mongoosePaginate);

const User = mongoose.model('User', userSchema);

module.exports = User;


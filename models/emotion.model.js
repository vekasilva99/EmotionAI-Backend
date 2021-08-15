const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const emotionSchema = new Schema({
    name : {
        type: String,
        required: true,
        unique: true,
    },
    active: {
        type: Boolean,
        required: true,
    },
    companyID: {
        type: Schema.Types.ObjectId, 
        ref: 'Company', 
        required: true,
    },

});

const Emotion = mongoose.model('Emotion', emotionSchema);

module.exports = Emotion;
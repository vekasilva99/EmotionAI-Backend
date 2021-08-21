const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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

emotionSchema.plugin(mongoosePaginate);

const Emotion = mongoose.model('Emotion', emotionSchema);

module.exports = Emotion;
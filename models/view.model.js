const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;

const viewSchema = new Schema({
    videoID: {
        type: Schema.Types.ObjectId, 
        ref: 'Video', 
        required: true,
    },
    // En segundos.
    time: {
        type: Number,
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
    },
    attention: {
        type: Boolean,
        required: true,
    },
    age: {
        type: Number,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },


});

viewSchema.plugin(mongoosePaginate);

const View = mongoose.model('View', viewSchema);

module.exports = View;
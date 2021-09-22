const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;

const embeddingSchema = new Schema({
    emotionID: {
        type: Schema.Types.ObjectId, 
        ref: 'Emotion', 
        required: true,
    },
    embedding: {
        type: Object,
        required: true,
    },
    img: {
        type: String,
        required: true,
    },

});

embeddingSchema.plugin(mongoosePaginate);

const Embedding = mongoose.model('Embedding', embeddingSchema);

module.exports = Embedding;
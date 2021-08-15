const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const embeddingSchema = new Schema({
    emotionID: {
        type: Schema.Types.ObjectId, 
        ref: 'Emotion', 
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
    },
    img: {
        type: String,
        required: true,
    },

});

const Embedding = mongoose.model('Embedding', embeddingSchema);

module.exports = Embedding;
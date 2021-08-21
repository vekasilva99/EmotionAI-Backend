const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;

const videoSchema = new Schema({
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
    // El link del video en YouTube.
    link: {
        type: String,
    },
    mainImg: {
        type: String,
        required: true,
    },
    // Se guarda en segundos.
    duration: {
        type: Number,
    },
    publishDate: {
        type: Date,
    },
    // Para guardar nosotros mismos el video.
    file: {
        type: String,
    }


});

videoSchema.plugin(mongoosePaginate);

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
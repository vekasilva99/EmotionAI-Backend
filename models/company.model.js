const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;

const companySchema = new Schema({
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
    full_name: {
        type: String,
        required: true,
        unique: true,
    },
    active: {
        type: Boolean,
        required: true,
    },
    accepted: {
        type: Boolean,
        required: true,
    },
    mainImg: {
        type: String,
        // required: true,
    },

});

companySchema.plugin(mongoosePaginate);

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
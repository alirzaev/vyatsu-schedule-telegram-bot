const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const visitSchema = new Schema({
    telegram_id: String,
    data: String,
    type: String,
    date: {
        type: Date,
        default: Date.now
    }
});

const Visit = mongoose.model('Visit', visitSchema);

module.exports = Visit;

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const preferencesSchema = new Schema({
    telegram_id: String,
    group_id: String
});

const UserPreferences = mongoose.model('UserPreferences', preferencesSchema);

module.exports = UserPreferences;

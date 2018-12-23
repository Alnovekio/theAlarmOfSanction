var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/Alarm');

var Schema = mongoose.Schema({
    note: String,
	id: Number,
	finished: Boolean
}, { collection: "Note" });
var NMongo = mongoose.model('Note', Schema);
module.exports = NMongo;
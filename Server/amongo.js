var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/Alarm');

var Schema = mongoose.Schema({
    hour: String,
    minute: String,
	repeat: Boolean,
	weekly: [Number, Number, Number, Number, Number, Number, Number],
	appoint: Boolean,
	month: Number,
	date: Number,
	note: String
}, { collection: "Alarm" });
var AMongo = mongoose.model('Alarm', Schema);
module.exports = AMongo;
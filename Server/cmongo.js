var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/Alarm');

var Schema = mongoose.Schema({
	time: [Number, Number, Number, Number, Number, Number, Number]
}, { collection: "Cost" });
module.exports = mongoose.model('Cost', Schema);

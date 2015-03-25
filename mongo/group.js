var mongoose = require('mongoose');

module.exports = mongoose.model('Group', mongoose.Schema({
	name: String,
	creater: String,
	counts: Number,
	members: [String],
	msgTags: [String],
	date: Date
}));
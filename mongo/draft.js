var mongoose = require('mongoose');

DraftSchema = mongoose.Schema({
	groupId: String,
	userId: String,
	date: String,
	timestamp: Number,
	html: String,
	text: String,
	tags: [String]
});

module.exports = mongoose.model('Draft', DraftSchema);
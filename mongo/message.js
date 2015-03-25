var mongoose = require('mongoose');

var labelSchema = mongoose.Schema({
	name: String,
	users: [String]
});

MessageSchema = mongoose.Schema({
	groupId: String,
	userId: String,
	date: String,
	timestamp: Number,
	html: String,
	text: String,
	tags: [String],
	likes: [String],
	labels: [labelSchema]
});

module.exports = mongoose.model('Message', MessageSchema);
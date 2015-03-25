var mongoose = require('mongoose');

module.exports = mongoose.model('User', mongoose.Schema({
	name: String,
	description: String,
	header: String,
	extId: String
}));
var express = require('express');
var path = require('path');
var os = require("os");
var router = express.Router();
var User = require(path.join(__dirname, '..', 'mongo', 'user.js'));
var Group = require(path.join(__dirname, '..', 'mongo', 'group.js'));
var Message = require(path.join(__dirname, '..', 'mongo', 'message.js'));
var utils = require('./utils.js');
var request = require('request');

var findGroupName = function (groups, targetId) {
	for (var index in groups) {
		if (groups[index]._id == targetId) return groups[index].name;
	}
};
var findLatestMessages = function (user, callback) {
	Group.find({$or: [{'members': user._id}, {'creater': user._id}]}).exec(function (err, groups) {
		if (groups) {
			var groupIds = [];
			groups.forEach(function (item) {
				groupIds.push(item._id);
			});

			Message.find({groupId: {$in: groupIds}}).sort('-timestamp').limit(4).exec(function (err, messages) {
				utils.createClientMessageBatch(messages, user._id, function (clientMessages) {
					clientMessages.forEach(function (msg) {
						msg.groupName = findGroupName(groups, msg.groupId);
					});

					callback(clientMessages);
				});
			});
		} else {
			callback([]);
		}
	});
};

router.get('/getlatest.json', function (req, res, next) {
	var workCardUserId = req.query.workCardUserId;
	var workCardAppToken = req.query.workCardAppToken;
	var workCardNamespace = req.query.workCardNamespace;
	var workCardSignKey = req.query.workCardSignKey;

	if (!workCardUserId || !workCardAppToken || !workCardNamespace) return res.json({
		success: false
	});

	var url = 'https://work.alibaba-inc.com/xservice/open/api/v1/user/getPeasonBaseInfo.json?'
			+ 'workCardAppToken=' + workCardAppToken
			+ '&workCardNamespace=' + workCardNamespace
			+ '&workCardUserId=' + workCardUserId
			+ '&emplid=' + workCardUserId;

	request.get(url, function (err, httpResponse, body) {
		var userInfo = body && body.content ? body.content : undefined;
		User.findOne({'extId': workCardUserId}, function (err, user) {
			if (!user) {
				var user = new User({
					name: userInfo && userInfo.nick ? userInfo.nick : workCardUserId,
					description: userInfo && userInfo.dept ? userInfo.dept : '',
					extId: workCardUserId,
					header: userInfo && userInfo.headPath ? ('https://work.alibaba-inc.com' + userInfo.headPath)
						: 'http://voice.alipay.net:9000/resource/default.jpg'
				});
				console.log('SAVE USER:');
				console.log(user);
				user.save(function (err, newUser) {
					if (err) return res.json({
						success: false
					});

					res.json({
						success: true,
						user: newUser,
						notes: []
					});
					console.log('RETURN');
					console.log({
						success: true,
						user: newUser,
						notes: []
					})
				});
			} else {
				var userChanged = false;
				if (userInfo && userInfo.nick && userInfo.nick != user.name) {
					user.name = userInfo.nick;
					userChanged = true;
				}
				if (userInfo && userInfo.dept && userInfo.dept != user.description) {
					user.description = userInfo.dept;
					userChanged = true;
				}
				if (userInfo && userInfo.headPath && user.header != ('https://work.alibaba-inc.com' + userInfo.headPath)) {
					user.header = 'https://work.alibaba-inc.com' + userInfo.headPath;
					userChanged = true;
				}

				if (userChanged) {
					console.log('UPDATE USER:');
					user.save(function (err, newUser) {
						findLatestMessages(newUser, function (notes) {
							res.json({
								success: true,
								user: newUser,
								notes: notes
							});
							console.log('RETURN');
							console.log({
								success: true,
								user: newUser,
								notes: notes
							});
						});
					});
				} else {
					console.log('UNCHANGE USER:');
					findLatestMessages(user, function (notes) {
						res.json({
							success: true,
							user: user,
							notes: notes
						});
						console.log('RETURN');
						console.log({
							success: true,
							user: user,
							notes: notes
						});
					});
				}
			}
		});
	});
});

module.exports = router;
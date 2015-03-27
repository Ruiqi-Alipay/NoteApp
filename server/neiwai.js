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

router.get('/getlatest.json&dev=true', function (req, res, next) {
	var workCardUserId = req.query.workCardUserId;
	var workCardAppToken = req.query.workCardAppToken;
	var workCardNamespace = req.query.workCardNamespace;
	var workCardSignKey = req.query.workCardSignKey;

	if (!workCardUserId || !workCardAppToken || !workCardNamespace) return res.json({
		success: false
	});

	User.findOne({'extId': workCardUserId}, function (err, user) {
		if (user) {
			var url = 'https://work.alibaba-inc.com/xservice/open/api/v1/user/getPeasonBaseInfo.json?'
					+ 'workCardAppToken=' + workCardAppToken
					+ '&workCardNamespace=' + workCardNamespace
					+ '&workCardUserId=' + workCardUserId
					+ '&emplid=' + workCardUserId;
			console.log(url);
			request.get(url,
				function (err, httpResponse, body) {
		      		console.log(body);
		      		res.json(body);
		    	}
		    );
			// var user = new User({
			// 	name: '测试用户名',
			// 	description: '测试职位描述',
			// 	extId: workCardUserId,
			// 	header: path.join(os.hostname(), 'resource', 'default.jpg')
			// });
			// user.save(function (err, newUser) {
			// 	if (err) return res.json({
			// 		success: false
			// 	});

			// 	res.json({
			// 		success: true,
			// 		user: newUser,
			// 		notes: []
			// 	});
			// });
		} else {
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

							res.json({
								success: true,
								user: user,
								notes: clientMessages
							});
						});
					});
				} else {
					res.json({
						success: true,
						user: user,
						notes: []
					});
				}
			});
		}
	});
});

module.exports = router;
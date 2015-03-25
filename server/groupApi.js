var path = require('path');
var moment = require('moment');
var utils = require('./utils.js');
var Group = require(path.join(__dirname, '..', 'mongo', 'group.js'));
var User = require(path.join(__dirname, '..', 'mongo', 'user.js'));
var Message = require(path.join(__dirname, '..', 'mongo', 'message.js'));
var Draft  =require(path.join(__dirname, '..', 'mongo', 'draft.js'));

var groupOperateParamCheck = function (req, res) {
	if (!req.group) {
	 	res.json({
			success: false,
			data: '参数错误：没有找到改群组'
		});
		return false;
	}

	if (req.group.creater != req.body.userid && req.group.creater != req.query.userid) {
		res.json({
			success: false,
			data: '操作失败：您没有权限这样做'
		});
		return false;
	}

	return true;
}

var messageOperateCheck = function (req, res) {
	if (!req.group) {
		res.json({
			success: false,
			data: '操作失败：无效的群组'
		})
		return false;
	}

	var userid = req.query.userid ? req.query.userid : req.body.userid;

	if (!userid || req.group.members.indexOf(userid) < 0) {
		res.json({
			success: false,
			data: '操作失败：您没有权限这样做'
		});
		return false;
	}	

	return true;
}

var processMessageResult = function (messages, userId, res, ext) {
	utils.createClientMessageBatch(messages, userId, function (clientMessages) {
		res.json({
			success: true,
			data: clientMessages,
			ext: ext
		});
	});
};

module.exports = {
	groupId: function (req, res, next, id) {
		Group.findById(id, function (err, group) {
			if (group) {
				req.group = group;
			}

			return next();
		});
	},
	messageId: function (req, res, next, id) {
		if (!req.group) return next(new Error('Group not found!'));

		Message.findById(id, function (err, message) {
			if (!err && message.groupId == req.group._id) {
				req.message = message;
			}

			return next();
		});
	},
	createGroup: function (req, res, next) {
		if (!req.body.name || req.body.name.length == 0) return res.json({
			success: false,
			data: '操作失败：新群组名称为空！'
		});
		
		if (!req.body.userid) return next(new Error('query params userid is empty!'))

		User.findById(req.body.userid, function (err, user) {
			if (err || !user) return res.json({
				success: false,
				data: '操作失败：无效的用户'
			});

			var newGroup = new Group({
				name: req.body.name,
				creater: req.body.userid,
				date: moment(),
				members: [req.body.userid],
				msgTags: [],
				counts: 0
			});

			newGroup.save(function (err, group) {
				if (err) return res.json({
					success: false,
					data: '操作失败：' + err.toString()
				});

				res.json({
					success: true,
					data: utils.createClientGroup(group)
				});
			});
		});
	},
	deleteGroup: function (req, res, next) {
		if (!groupOperateParamCheck(req, res)) return;

		req.group.remove(function (err, removedItem) {
			if (err) return res.json({
				success: false,
				data: '操作失败：' + err.toString()
			});

			Message.remove({groupId: removedItem._id});

			res.json({
				success: true,
				data: utils.createClientGroup(removedItem)
			});
		})
	},
	updateGroup: function (req, res, next) {
		if (!groupOperateParamCheck(req, res)) return;

		if (req.body.name && req.body.name.length > 0) {
			req.group.name = req.body.name;
		}

		req.group.save(function (err, group) {
			if (err) return res.json({
				success: false,
				data: '操作失败：' + err.toString()
			});

			res.json({
				success: true,
				data: utils.createClientGroup(group)
			});
		});
	},
	getGroupMembers: function (req, res, next) {
		if (!messageOperateCheck(req, res)) return;

		if (!req.group.members) return {
			success: true,
			data: []
		};

		User.find({'_id': {$in: req.group.members}}, function (err, users) {
			res.json({
				success: true,
				data: utils.createClientUserBatch(users)
			});
		});
	},
	addMember: function (req, res, next) {
		if (!groupOperateParamCheck(req, res)) return;

		if (!req.body.memberId) return next(new Error('New member ID is empty!'));
		if (req.group.creater == req.body.memberId) return res.json({
			success: true
		});

		User.findById(req.body.memberId, function (err, user) {
			if (err || !user) return res.json({
				success: false,
				data: '没有找到改用户'
			});

			if (!req.group.members) {
				req.group.members = [];
			}

			if (req.group.members.indexOf(user._id.toString()) < 0) {
				req.group.members.push(user._id.toString());
			} else {
				return res.json({
					success: true
				});
			}

			req.group.save(function (err, updatedGroup) {
				if (err) return res.json({
					success: false,
					data: '操作失败：' + err.toString()
				});

				User.find({'_id': {$in: updatedGroup.members}}, function (err, users) {
					var clientGroup = utils.createClientGroup(updatedGroup);
					clientGroup.members = utils.createClientUserBatch(users);
					res.json({
						success: true,
						data: clientGroup
					});
				});
			});
		});
	},
	removeMember: function (req, res, next) {
		if (!groupOperateParamCheck(req, res)) return;

		if (!req.body.memberId) return next(new Error('New member ID is empty!'));
		if (!req.group.members || req.group.members.indexOf(req.body.memberId) < 0) return res.json({
			success: true
		});

		req.group.members.splice(req.group.members.indexOf(req.body.memberId), 1);

		req.group.save(function (err, updatedGroup) {
			if (err) return res.json({
				success: false,
				data: '操作失败：' + err.toString()
			});

			User.find({'_id': {$in: updatedGroup.members}}, function (err, users) {
				var clientGroup = utils.createClientGroup(updatedGroup);
				clientGroup.members = utils.createClientUserBatch(users);
				res.json({
					success: true,
					data: clientGroup
				});
			});
		})
	},
	createMessage: function (req, res, next) {
		if (!messageOperateCheck(req, res)) return;

		if (!req.body.html || !req.body.text) {
			return res.json({
				success: false,
				data: '操作失败：消息内容不得为空'
			});
		}

		if (!req.body.tags || req.body.tags.length == 0) {
			req.body.tags = ['无标签'];
		}

		var date = moment();
		var newMessage = new Message({
			groupId: req.group._id,
			userId: req.body.userid,
			date: date.format('YYYY 年 M 月 D 日，H:mm:ss'),
			timestamp: date.format('x'),
			text: req.body.text,
			html: req.body.html,
			tags: req.body.tags
		});

		newMessage.save(function (err, message) {
			if (err) return res.json({
				success: false,
				data: '操作失败：' + err.toString()
			});

			if (req.body.draftId) {
				console.log('remove: ' + req.body.draftId);
				Draft.findById(req.body.draftId).remove(function (err, remove) {
					console.log(err);
					console.log(remove);
				});
			}

			Message.count({'groupId': req.group._id}, function (err, counts) {
				var groupModified = false;
				if (req.group.counts != counts) {
					req.group.counts = counts;
					groupModified = true;
				}

				if (message.tags) {
					message.tags.forEach(function (tag) {
						if (!req.group.msgTags || req.group.msgTags.indexOf(tag) < 0) {
							if (!req.group.msgTags) {
								req.group.msgTags = [];
							}

							req.group.msgTags.push(tag);
							groupModified = true;
						}
					});
				}

				if (groupModified) {
					req.group.save();
				}

				if (req.query.last) {
					Message.find({'timestamp': {$gt: req.query.last}}).sort('-timestamp').exec(function (err, messages) {
						if (err) return res.json({
							success: false,
							data: '操作失败：' + err.toString()
						});

						processMessageResult(messages, req.body.userid, res, groupModified ? utils.createClientGroup(req.group) : undefined);
					});
				} else {
					processMessageResult([message], req.body.userid, res, groupModified ? utils.createClientGroup(req.group) : undefined);
				}
			});
		});
	},
	getMessages: function (req, res, next) {
		if (!messageOperateCheck(req, res)) return;

		var find = {
			groupId: req.group._id
		};
		if (req.query.tags) {
			var tags = decodeURIComponent(req.query.tags).split(',');
			if (tags && tags.length > 0) {
				find.tags = {
					$elemMatch: { $in: tags }
				};
			}
		}
		if (req.query.last) {
			find.timestamp = {
				$lt: req.query.last
			}
		}

		Message.find(find).sort('-timestamp').limit(10).exec(function (err, messages) {
			if (err) return res.json({
				success: false,
				data: '操作失败：' + err.toString()
			});

			processMessageResult(messages, req.query.userid, res);
		});
	},
	searchContent: function (req, res, next) {
		if (!messageOperateCheck(req, res)) return;
		if (!req.query.q) return res.json({
			success: false,
			data: '查询内容不可为空'
		});

		var seatchText = decodeURIComponent(req.query.q);
		Message.find({'text': new RegExp('.*' + seatchText + '.*'), 'groupId': req.group._id})
				.sort('-date').exec(function (err, messages) {
			if (err) return res.json({
				success: false,
				data: '操作失败：' + err.toString()
			});

			processMessageResult(messages, req.query.userid, res);
		});
	}
};










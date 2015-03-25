var path = require('path');
var User = require(path.join(__dirname, '..', 'mongo', 'user.js'));
var Group = require(path.join(__dirname, '..', 'mongo', 'group.js'))
var Message = require(path.join(__dirname, '..', 'mongo', 'message.js'));
var Draft = require(path.join(__dirname, '..', 'mongo', 'draft.js'));
var utils = require('./utils.js');
var moment = require('moment');
var q = require('q');

var userCheck = function (req, res) {
	if (!req.user) {
		res.json({
			success: false,
			data: '无效的用户'
		});
		return false;
	}
	return true;
};
var draftCheck = function (req, res) {
	if (!req.draft) {
		res.json({
			success: false,
			data: '无效的草稿'
		});
		return false;
	}
	return true;
};
var prepareUserGroups = function (userId) {
	var defered = q.defer();

	var clientGroups = [];
	Message.count({'likes': userId}, function (err, likeCount) {
		Message.count({'labels.users': userId}, function (err, labledCount) {
			Draft.count({'userId': userId}, function (err, draftCount) {
				Group.find({$or: [{'members': userId}, {'creater': userId}]}).sort('date').exec(function (err, groups) {
					if (!groups || groups.length == 0) {
						return defered.resolve({
							groups: clientGroups,
							likeCount: likeCount,
							labledCount: labledCount,
							draftCount: draftCount
						});
					}

					groups.forEach(function (group) {
						Message.find({'groupId': group._id}).sort('-timestamp').limit(2).exec(function (err, messages) {
							var clientGroup = utils.createClientGroup(group);
							utils.createClientMessageBatch(messages, userId, function(clientMessages) {
								clientGroup.recents = clientMessages;
								clientGroups.push(clientGroup);
									
								if (clientGroups.length == groups.length) defered.resolve({
									groups: clientGroups,
									likeCount: likeCount,
									labledCount: labledCount,
									draftCount: draftCount
								});
							});
						});
					});
				});
			});
		});
	});

	return defered.promise;
};
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
	userId: function (req, res, next, id) {
		User.findById(id, function (err, user) {
			req.user = user;

			return next();
		});
	},
	getUser: function (req, res, next) {
		var extid = req.query.extid;
		if (!extid) return res.json({
			success: false,
			data: '请求参数错误：没有内外Token'
		});

		User.findOne({'extId': extid}, function (err, user) {
			if (!user) {
				var user = new User({
					name: extid,
					description: '职位描述',
					extId: extid
				});
				user.save(function (err, newUser) {
					if (err) return res.json({
						success: false,
						data: '新建用户错误：' + err.toString()
					});

					var clientUser = utils.createClientUser(newUser);
					clientUser.groups = [];

					res.json({
						success: true,
						data: clientUser
					});
				});
			} else {
				prepareUserGroups(user._id.toString()).then(function (result) {
					var clientUser = utils.createClientUser(user);
					clientUser.groups = result.groups;
					clientUser.likeCount = result.likeCount;
					clientUser.labledCount = result.labledCount;
					clientUser.draftCount = result.draftCount;

					res.json({
						success: true,
						data: clientUser
					});
				}).catch(function (err) {
					res.json({
						success: false,
						data: '同步用户群组出错：' + err.toString()
					})
				});
			}
		});
	},
	searchUser: function (req, res, next) {
		var user = req.query.user;
		if (!user) return res.json({
			success: false,
			data: '查询内容不可为空'
		});

		User.findOne({'name':  decodeURIComponent(user)}, function (err, user) {
			res.json({
				success: true,
				data: user ? utils.createClientUser(user) : user
			});
		});
	},
	deleteUser: function (req, res, next) {
		if (!req.user) return next(new Error('User not found!'));

		req.user.remove(function (err, removedItem) {
			if (err) return next(err);

			res.json({
				success: true,
				data: utils.createClientUser(removedItem)
			});
		});
	},
	getUserLikesMessage: function (req, res, next) {
		if (!req.user) return res.json({
			success: false,
			data: '无效的用户'
		});

		var find = {
			likes: req.user._id
		};
		if (req.query.last) {
			find.timestamp = {
				$lt: req.query.last
			}
		}
		if(req.query.q) {
			var seatchText = decodeURIComponent(req.query.q);
			find.text = new RegExp('.*' + seatchText + '.*');
		}

		console.log(find);

		Message.find(find).sort('-timestamp').limit(10).exec(function (err, messages) {
			if (err) return res.json({
				success: false,
				data: '操作失败：' + err.toString()
			});

			processMessageResult(messages, req.user._id, res);
		});
	},
	getUserLabledMessage: function (req, res, next) {
		if (!req.user) return res.json({
			success: false,
			data: '无效的用户'
		});

		var find = {
			'labels.users': req.user._id
		};
		if (req.query.last) {
			find.timestamp = {
				$lt: req.query.last
			}
		}
		if (req.query.q) {
			var seatchText = decodeURIComponent(req.query.q);
			find.text = new RegExp('.*' + seatchText + '.*');
		}

		Message.find(find).sort('-timestamp').limit(10).exec(function (err, messages) {
			if (err) return res.json({
				success: false,
				data: '操作失败：' + err.toString()
			});

			processMessageResult(messages, req.user._id, res);
		});
	},
	draftId: function (req, res, next, id) {
		Draft.findById(id, function (err, draft) {
			req.draft = draft;

			return next();
		});
	},
	createDraft: function (req, res, next) {
		if (!userCheck(req, res)) return;
		if (!req.body.text || !req.body.html || !req.body.groupId) return res.json({
			success: false,
			data: '不能保存内容为空的草稿'
		});

		var date = moment();
		var draft = new Draft({
			userId: req.user._id,
			groupId: req.body.groupId,
			date: date.format('YYYY 年 M 月 D 日，H:mm:ss'),
			timestamp: date.format('x'),
			text: req.body.text,
			html: req.body.html,
			tags: req.body.tags
		});

		draft.save(function (err, draft) {
			if (err) return res.json({
				success: false,
				data: '保存草稿失败'
			});

			res.json({
				success: true,
				data: utils.createClientDraft(draft)
			});
		});
	},
	updateDraft: function (req, res, next) {
		if (!userCheck(req, res) || !draftCheck(req, res)) return;
		if (!req.body.text || !req.body.html) return res.json({
			success: false,
			data: '不能保存内容为空的草稿'
		});

		var date = moment();
		req.draft.date = date.format('YYYY 年 M 月 D 日，H:mm:ss');
		req.draft.timestamp = date.format('x');
		req.draft.text = req.body.text;
		req.draft.html = req.body.html;

		req.draft.save(function (err, draft) {
			if (err) return res.json({
				success: false,
				data: '保存草稿失败'
			});

			res.json({
				success: true,
				data: utils.createClientDraft(draft)
			});
		});
	},
	getDrafts: function (req, res, next) {
		if (!userCheck(req, res)) return;

		var find = {userId: req.user._id};
		if (req.query.last) {
			find.timestamp = {
				$lt: req.query.last
			}
		}

		Draft.find(find).sort('-timestamp').limit(10).exec(function (err, drafts) {
			if (err) return res.json({
				success: false,
				data: '获取草稿失败!'
			});

			res.json({
				success: true,
				data: utils.createClientDraftBatch(drafts)
			});
		});
	},
	deleteDraft: function (req, res, next) {
		if (!userCheck(req, res)) return;

		if (!req.draft) return res.json({
			success: false,
			data: '草稿不存在'
		});

		req.draft.remove(function (err, removedItem) {
			if (err) return res.json({
				success: false,
				data: '删除草稿失败!'
			});

			res.json({
				success: true,
				data: utils.createClientDraft(removedItem)
			});
		});
	}
};







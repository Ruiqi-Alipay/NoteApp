var utils = require('./utils.js');
var path = require('path');
var Message = require(path.join(__dirname, '..', 'mongo', 'message.js'));

var messageOperateCheck = function (req, res) {
	if (!req.user) {
		res.json({
			success: false,
			data: '用户不存在'
		});
		return false;
	}
	return true;
};

var findLabelIndex = function (labels, newLabel) {
	if (!labels) return -1;

	for (var index in labels) {
		if (labels[index].name == newLabel) {
			return index;
		}
	}
};

module.exports = {
	messageId: function (req, res, next, id) {
		Message.findById(id, function (err, message) {
			req.message = message;

			return next();
		});
	},
	likeMessage: function (req, res, next) {
		if (!messageOperateCheck(req, res)) return;
		if (!req.query.like || !req.query.msgid) return next(new Error('Like message url must have a like and a msgid prameter'));

		Message.findById(req.query.msgid, function (err, message) {
			if (err) return res.json({
				success: false,
				data: '笔记没有找到'
			});

			if (req.query.like == 'true') {
				if (!message.likes) {
					message.likes = [req.user._id.toString()];
				} else if (message.likes.indexOf(req.user._id) < 0) {
					message.likes.push(req.user._id.toString());
				}
			} else {
				if (message.likes && message.likes.indexOf(req.user._id) >= 0) {
					message.likes.splice(message.likes.indexOf(req.user._id), 1);
				}
			}

			message.save(function (err, message) {
				if (err) return res.json({
					success: false,
					data: '保存笔记失败'
				});

				utils.createClientMessageBatch([message], req.user._id, function (clientMessages) {
					res.json({
						success: true,
						data: clientMessages
					})
				});
			})
		});
	},
	labelMessage: function (req, res, next) {
		if (!messageOperateCheck(req, res)) return;
		if (!req.query.label || !req.query.msgid) return next(new Error('Label message url must have a label and a msgid prameter'));

		Message.findById(req.query.msgid, function (err, message) {
			if (err) return res.json({
				success: false,
				data: '笔记没有找到'
			});

			var userId = req.user._id.toString();
			var labelName = decodeURIComponent(req.query.label);
			var index = findLabelIndex(message.labels, labelName);
			if (index >= 0) {
				var targetLabel = message.labels[index];
				if (targetLabel.users.indexOf(userId) < 0) {
					targetLabel.users.push(userId);
				}
			} else {
				if (!message.labels) {
					message.labels = [];
				}

				message.labels.push({
					name: labelName,
					users: [userId]
				})
			}

			message.save(function (err, message) {
				if (err) return res.json({
					success: false,
					data: '保存笔记失败'
				});

				utils.createClientMessageBatch([message], req.user._id, function (clientMessages) {
					res.json({
						success: true,
						data: clientMessages
					})
				});
			});
		});
	},
	editMessage: function (req, res, next) {
		if (!req.message) return res.json({
			success: false,
			data: '无效的笔记'
		});
		if (!req.body.userid || req.body.userid != req.message.userId) return res.json({
			success: false,
			data: '你没有权限这样做'
		});

		req.message.html = req.body.html;
		req.message.text = req.body.text;
		req.message.save(function (err, message) {
			if (err) return res.json({
				success: false,
				data: '更新失败'
			});

			utils.createClientMessageBatch([message], req.body.userid, function (clientMessages) {
				res.json({
					success: true,
					data: clientMessages
				})
			});
		});
	},
	deleteMessage: function (req, res, next) {
		if (!req.message) return res.json({
			success: false,
			data: '无效的笔记'
		});
		if (!req.body.userid || req.body.userid != req.message.userId) return res.json({
			success: false,
			data: '你没有权限这样做'
		});

		req.message.remove(function (err, message) {
			if (err) return res.json({
				success: false,
				data: '删除失败'
			});

			utils.createClientMessageBatch([message], req.body.userid, function (clientMessages) {
				res.json({
					success: true,
					data: clientMessages
				})
			});
		});
	}
};








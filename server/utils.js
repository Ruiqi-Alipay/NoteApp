var path = require('path');
var User = require(path.join(__dirname, '..', 'mongo', 'user.js'));

var createClientUser = function (user) {
	return {
		id: user._id.toString(),
		name: user.name,
		description: user.description,
		header: user.header
	}
};
var createClientMessage = function (message) {
	return {
		id: message._id.toString(),
		date: message.date,
		timestamp: message.timestamp,
		text: message.text,
		html: message.html,
		tags: message.tags,
		likes: message.likes,
		labels: message.labels
	}
};
var createClientDraft = function (draft) {
	return {
		id: draft._id.toString(),
		groupId: draft.groupId,
		userId: draft.userId,
		date: draft.date,
		timestamp: draft.timestamp,
		html: draft.html,
		text: draft.text,
		tags: draft.tags,
	}
};
var createClientGroup = function (group) {
	return {
		id: group._id.toString(),
		name: group.name,
		creater: group.creater,
		counts: group.counts,
		msgTags: group.msgTags,
		date: group.date
	}
};
var findUser = function (users, userId) {
	if (!users) return;
	for (var index in users) {
		if (users[index]._id == userId) return users[index];
	}
};

module.exports = {
	cutMessages: function (messages) {
		if (messages) {
			messages.forEach(function (message) {
				if (message.content.length > 160) {
					message.content =  message.content.slice(0, 160);
				}
			});
		}
		return messages;
	},
	createClientDraft: function (draft) {
		return createClientDraft(draft);
	},
	createClientDraftBatch: function (drafts) {
		var result = [];
		if (drafts) {
			drafts.forEach(function (item) {
				result.push(createClientDraft(item));
			});
		}
		return result;
	},
	createClientUser: function (user) {
		return createClientUser(user);
	},
	createClientUserBatch: function (users) {
		var result = [];
		if (users) {
			users.forEach(function (item) {
				result.push(createClientUser(item));
			});
		}
		return result;
	},
	createClientGroup: function (group) {
		return createClientGroup(group);
	},
	createClientGroupBatch: function (groups) {
		var result = [];
		if (groups) {
			groups.forEach(function (item) {
				result.push(createClientGroup(item));
			});
		}
		return result;
	},
	createClientMessageBatch: function (messages, userId, callback) {
		var result = [];
		if (!messages) {
			return callback(result);
		}

		var userIds = [];
		messages.forEach(function (item) {
			if (userIds.indexOf(item.userId) < 0) userIds.push(item.userId);
			if (item.labels) {
				item.labels.forEach(function (label) {
					if (label.users) {
						label.users.forEach(function (user) {
							if (userIds.indexOf(user) < 0) userIds.push(user);
						});
					}
				});
			}
		});

		User.find({'_id': {$in: userIds}}, function (err, users) {
			messages.forEach(function (item) {
				var client = createClientMessage(item);
				var sender = findUser(users, item.userId);
				if (sender) {
					client.senderName = sender.name;
					client.senderHeader = sender.header;
				}

				if (client.labels) {
					var labels = [];
					client.labels.forEach(function (label) {
						var clientUsers = [];
						if (label.users) {
							label.users.forEach(function (user) {
								var sender = findUser(users, user);
								if (sender) {
									clientUsers.push({
										id: user,
										name: sender.name,
										header: sender.header
									})
								}
							});
						}

						labels.push({
							name: label.name,
							users: clientUsers,
							liked: label.users && label.users.indexOf(userId) >= 0
						})
					});
					client.labels = labels;
				}
				
				result.push(client);
			});

			callback(result);
		});
	},
};
var assert = require('chai').assert;
var request = require('request');

describe('User interface check', function(){
  	var date = new Date();
  	var user;
  	var group;

    it('Create user', function (done) {
	    request.get({
	        url: 'http://localhost/note/api/user?extid=' + date.getTime(),
	        }, function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	user = result.data;
	        	assert.isTrue(result.success, 'Create user success');
	        	assert.property(user, 'id');
	        	assert.property(user, 'name');
	        	assert.property(user, 'description');
	        	
	        	done();
	        });
    })
    it('Check user creation using get interface', function (done) {
	    request.get({
	        url: 'http://localhost/note/api/user?extid=' + date.getTime(),
	        }, function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Query user success!');
	        	assert.equal(result.data.id, user.id, 'Same user returned!');
	        	done();
	        });
    })
    it('Check user creation using search interface', function (done) {
	    request.get({
	        url: 'http://localhost/note/api/user/search?user=' + encodeURIComponent(date.getTime()),
	        }, function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Search user success!');
	        	assert.equal(result.data.id, user.id, 'Same user returned!');
	        	done();
	        });
    })
    it('Create gourp', function (done) {
	    request.post({
		        url: 'http://localhost/note/api/group',
		        headers: {
		        	'content-type': 'application/json'
		        },
		        body: JSON.stringify({
		        	name: 'GROUPA',
	        		userid: user.id
		        })
		    },
		    function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Query user success!');
	        	group = result.data;
	        	assert.property(group, 'id');
	        	assert.property(group, 'name');
	        	assert.property(group, 'creater');
	        	assert.property(group, 'date');
	        	done();
	        });
    });
    it('Edit gourp', function (done) {
	    request.post({
	        	url: 'http://localhost/note/api/group/' + group.id,
		        headers: {
		        	'content-type': 'application/json'
		        },
		        body: JSON.stringify({
		        	name: 'GROUPB',
	        		userid: user.id
		        })
		    },
	        function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Query user success!');
	        	assert.equal(result.data.id, group.id, 'Same group been updated!')
	        	assert.notEqual(result.data.name, group.name, 'Group name already changed!');
	        	group = result.data;
	        	assert.property(group, 'id');
	        	assert.property(group, 'name');
	        	assert.property(group, 'creater');
	        	assert.property(group, 'date');

	        	done();
	        });
    });
    it('Requery user, this time should include group', function (done) {
	    request.get({
	        url: 'http://localhost/note/api/user?extid=' + date.getTime(),
	        }, function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	user = result.data;
	        	assert.isTrue(result.success, 'Query user success');
	        	assert.property(user, 'id');
	        	assert.property(user, 'name');
	        	assert.property(user, 'description');
	        	assert.lengthOf(user.groups, 1, 'group length == 1');
	        	
	        	done();
	        });
    })
    it('Create message', function (done) {
	    request.post({
		        url: 'http://localhost/note/api/group/' + group.id + '/message',
		        headers: {
		        	'content-type': 'application/json'
		        },
		        body: JSON.stringify({
		        	text: 'MESSAGE',
	        		html: '<p>MESSAGE</p>',
	        		userid: user.id
		        })
		    },
		    function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Create user success!');
	        	var msg = result.data[0];
	        	assert.property(msg, 'id');
	        	assert.property(msg, 'text');
	        	assert.property(msg, 'html');
	        	assert.property(msg, 'date');
	        	assert.property(msg, 'timestamp');
	        	done();
	        });
    });
    it('Requery messages', function (done) {
	    request.get({
	        	url: 'http://localhost/note/api/group/' + group.id + '/message?userid=' + user.id
		    },
	        function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Query user success!');
	        	assert.lengthOf(result.data, 1, 'Group only has one message');

	        	done();
	        });
    });
    it('Delete group', function (done) {
	    request.del({
	        url: 'http://localhost/note/api/group/' + group.id + '?userid=' + user.id,
	        }, function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Delete group success!');
	        	assert.equal(result.data.id, group.id, 'Same group deleted!');
	        	done();
	        });
    })
    it('Requery user, this time should not include any group', function (done) {
	    request.get({
	        url: 'http://localhost/note/api/user?extid=' + date.getTime(),
	        }, function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	user = result.data;
	        	assert.isTrue(result.success, 'Query user success');
	        	assert.property(user, 'id');
	        	assert.property(user, 'name');
	        	assert.property(user, 'description');
	        	assert.lengthOf(user.groups, 0, 'group length == 0');
	        	
	        	done();
	        });
    })
    it('Delete user', function (done) {
	    request.del({
	        url: 'http://localhost/note/api/user/' + user.id,
	        }, function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Delete user success!');
	        	assert.equal(result.data.id, user.id, 'Same user deleted!');
	        	done();
	        });
    })
    it('Check user already deleted', function (done) {
	    request.get({
	        url: 'http://localhost/note/api/user/search?user=' + encodeURIComponent(date.getTime()),
	        }, function(err, httpResponse, result){
	        	var result = JSON.parse(result);
	        	assert.isTrue(result.success, 'Search user success!');
	        	assert.isNull(result.data, 'User already gone!');
	        	done();
	        });
    })
});
var express = require('express');
var path = require('path');

var router = express.Router();

router.get('/getlatest.json', function (req, res, next) {
	console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
	console.log(req);
	res.json({
		data: 'Just for test, get received!'
	});
});

router.post('/getlatest.json', function (req, res, next) {
	console.log('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
	console.log(req);
	res.json({
		data: 'Just for test, post received!'
	});
});

module.exports = router;
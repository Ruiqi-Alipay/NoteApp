var express = require('express');
var path = require('path');

var router = express.Router();

router.get('/getlatest', function (req, res, next) {
	res.json({
		data: 'Just for test, get received!'
	});
});

router.post('/getlatest', function (req, res, next) {
	res.json({
		data: 'Just for test, post received!'
	});
});

module.exports = router;
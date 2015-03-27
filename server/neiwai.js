var express = require('express');
var path = require('path');

var router = express.Router();

router.get('/getlatest.json&dev=true', function (req, res, next) {
	console.log(req.query);
	res.json({
		data: 'Just for test, get received!'
	});
});

module.exports = router;
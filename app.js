var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var path = require('path');

mongoose.connect('mongodb://localhost/yonote');

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use('/api', require(path.join(__dirname, 'server', 'api.js')));
app.use('/neiwai', require(path.join(__dirname, 'server', 'neiwai.js')));
app.use('/resource', express.static(path.join(__dirname, 'resource')));
app.use('/', express.static(path.join(__dirname, 'webapp')));

app.get('/', function(req, res){
	res.sendFile(path.join(__dirname, 'webapp', 'index.html'));
});

app.all('/*', function (req, res) {
	console.log(req.url);
	res.json({
		req: req.url
	})
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (require.main === module) {
	// if (cluster.isMaster) {
	//   // Fork workers.
	//   for (var i = 0; i < numCPUs; i++) {
	//     cluster.fork();
	//   }

	//   cluster.on('exit', function(worker, code, signal) {
	//     console.log('worker ' + worker.process.pid + ' died');
	//   });
	// } else {
	    // Workers can share any TCP connection
	    // In this case its a HTTP server
	    app.listen(9000, function(){
	        console.info('Yo-Note server listening on port ' + 9000);
	    });
	// }
} else {
    module.exports = app;
}
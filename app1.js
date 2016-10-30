
var http = require('http');
var fs = require('fs');
var url = require('url');
var config = require('./config');
var mime = require('./mime').types;
var path = require('path');
var port = 2300;

var server = http.createServer(function (req, res) {
	var pathname = url.parse(req.url).pathname;
	var realPath = 'assets' + pathname;
	var ext = path.extname(realPath);
	ext = ext ? ext.slice(1) : "unknown";
	var contentType = mime[ext] || "text/plain";　　　　　　　　

	fs.stat(realPath, function (err, stats) {
		if (err) {
			res.writeHead(404, "Not Found!", {'Content-Type': 'text/plain'});
			res.write("the URL " + realPath + "was not found");
			res.end();
		} else {
			fs.readFile(realPath, "binary", function (err, file) {
				if (err) {
					res.writeHead(500, {'Content-Type': 'text/plain'});
					res.end(err);
				} else {
					res.writeHead(200, {'Content-Type': contentType});
					res.write(file, "binary");
					res.end();
				}
			});
		}
	});
});

server.listen(port);
console.log("the port " + port + " has started");
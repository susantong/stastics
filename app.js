/**
*2016-10-25
*susantong
**/

var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var mime = require("./mime").types;
var config = require("./config");
var zlib = require("zlib");
var port = 3000;

//创建服务器端
var server = http.createServer(function (req, res) {
	//获取解析后的url地址(json格式)
	//console.log(req.url);
	var Url = url.parse(req.url);
	//console.log(Url);
	//获取路径值
	var pathname = Url.pathname;
	console.log(pathname);
	
	//当用户输入的路径不含路径时，默认输出当前文件中的index.html
	

	//join()方法连接字符串，nomalize()方法使路径规范化
	var realPath = path.join("assets", path.normalize(pathname.replace(/\.\./g, ""))); 
	console.log(realPath);

	//使用fs.stat方法获取文件
	var pathHandle = function (realPath) {
		fs.stat(realPath, function (error, states) {
			if (error) {
				res.writeHead(404, "the request" + pathname + "was not found!");
				res.write("404, the request " + realPath + " was not found");
				res.end();
			} else {
				  if(states.isDirectory()){
				  	if (pathname.slice(-1) != "/") {
				        pathname = pathname + "/";
				    }

				    res.setHeader("Content-Type","text/html; charset=utf-8");
				    var parent = path.dirname(pathname),
                    	css = '<style>li{list-style:none;} .folder a{color:#3a3;} .file a{color:rgb(0,0,238);} li span{margin:auto 10px; display:inline-block; min-width:100px;} li a{display:inline-block;min-width:300px;} a{text-decoration:none;}</style>',
                    	cont = "<ul>";
                    if(pathname!='/') cont += "<li><a href='/' style='color:red;'>::Root::(/)</li><li><a href='"+parent+"' style='color:red;'>::Parent::(../)</li>";
					fs.readdir(realPath, function (err, files) { // '/' denotes the root folder
						if (err) errHandle(pathname);
						files.forEach(function(file){
							try{
								stats = fs.lstatSync(path.join(realPath,file));
								if(stats.isDirectory()) { //conditing for identifying folders
									cont += '<li class="folder"><a href="'+pathname+file+'">['+file+']</a></span><span>Size: []</span></li>';
								}
								else{
									cont += '<li class="file"><a href="'+pathname+file+'">'+file+'</a><span>Size: '+stats.size+'</span></li>';
								}
							}catch(e){}
						});
						cont += "</ul>";
						res.write(css + cont);
						res.end();
					});

                } else {
				//返回.后缀名
				var ext = path.extname(realPath);
				//去除.，如果没有，默认为unknown
				ext = ext ? ext.slice(1): "unknown";
				//取出mime.js中的对应类型
				var contentType = mime[ext] || "unknown";
				//设置头
				res.setHeader("Content-Type", contentType);

				//设置最新打开时间，Last-Modified的属性标记此文件在服务器端最后被修改的时间
				//客户端第二次请求此URL时，根据HTTP协议的规定，浏览器会向服务器传送If-Modified-Since报头，询问该时间之后文件是否有被修改过：
				//如果服务器端的资源没有变化，则自动返回 HTTP 304（Not Changed.）状态码，内容为空，这样就节省了传输数据量
				//当服务器端代码发生改变或者重启服务器时，则重新发出资源，返回和第一次请求时类似。
				var lastModified = states.mtime.toUTCString();
				var ifModifiedSince = "If-Modified-Since".toLowerCase();
                    res.setHeader("Last-Modified", lastModified);

                //设置缓存时间
                if (ext.match(config.Expires.fileMatch)) {
                	var expires = new Date();
                	expires.setTime(expires.getTime() + config.Expires.maxAge * 1000);
                	//Expires 表示存在时间，允许客户端在这个时间之前不去检查（发请求），等同max-age的
					//效果。但是如果同时存在，则被Cache-Control的max-age覆盖。
					//maxAge方法与其相同
					res.setHeader("Expires", expires.toUTCString());
                    res.setHeader("Cache-Control", "max-age=" + config.Expires.maxAge);
                }

                //如果Last-Modified属性存在且没有改变，可以直接取出缓存
                if (req.headers[ifModifiedSince] && lastModified == req.headers[ifModifiedSince]) {
                	console.log("直接从浏览器缓存里取");
                	res.writeHead(304, "not Modified");
                	res.end();
                } else {
                	var raw = fs.createReadStream(realPath);
                    var acceptEncoding = req.headers['accept-encoding'] || "";
                    var matched = ext.match(config.Compress.match);

                    if (matched && acceptEncoding.match(/\bgzip\b/)) {
                        res.writeHead(200, "Ok", {'Content-Encoding': 'gzip'});
                        raw.pipe(zlib.createGzip()).pipe(res);
                    } else if (matched && acceptEncoding.match(/\bdeflate\b/)) {
                        res.writeHead(200, "Ok", {'Content-Encoding': 'deflate'});
                        raw.pipe(zlib.createDeflate()).pipe(res);
                    } else {
                        res.writeHead(200, "Ok");
                        raw.pipe(res);
                    }
                }

               }
            }
		});
	}

	pathHandle(realPath);
});

server.listen(port);
console.log("the port " + port + " has started");

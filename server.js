/**
 * The crawler site server for crawled site and admin cp for crawler.
 */

//TODO(Inaction) add crawler controle to the server,can start/pause/stop the crawler.
//TODO(Inaction) add crawler morniter to the server,web log/crawl report and chart/

require('./config/config.js');

var connect = require('connect');
var fs = require('fs');
var path = require('path');
var att = require('plugins/attachment.js');
var utils = require('./utilbox.js');
var zlib = require("zlib");

connect(
    connect.logger(':method :url - :res[content-type]', { buffer:5000 }),
    function (req, res, next) { //parse path '/'
      if (req.url === '/') {req.url = '/forum.php'}
      next();
    },
    function (req, res, next) { //attachements
      if (/^\/forum.php\?mod=attachment&aid/.test(req.url)) {
        var url = 'http://www.nocancer.com.cn' + req.url;
        var filePath = att.getAttFilePath(url);
        req.filePath = filePath;
        //call next();
//        res.setHeader('Accept-Ranges', 'bytes');
        console.log('get attachment', filePath);
      }
      next();
    },
    function (req, res, next) {//ucenter avatar images
      if (/^\/ucenter/.test(req.url)) {
        res.setHeader("Content-Type", "image/jpg");
        //console.log('Read file:', filePath);
        req.filePath = path.join(__dirname, '/www.nocancer.com.cn/', req.url);
      }
      next();
    },
    function (req, res, next) {
      if (/\.(php)$/.test(req.url) ||
          /^\/home\.php\?mod=space&uid=\d{1,6}$/.test(req.url) ||
          /forum\.php\?gid=/.test(req.url) ||
          /group\.php?gid=/.test(req.url) ||
          /^\/archiver\/\?/.test(req.url)) {
        res.setHeader("Content-Type", 'text/html; charset="utf-8"');
        req.filePath = path.join(__dirname, '/www.nocancer.com.cn/', req.url);
      }
      next();
    },
    function (request, response, next) {//static server
      if (request.filePath) {
        fs.stat(request.filePath, function (err, stats) {
          if (err) {
            next();
            return;
          }
          //BUG(Inaction) when use gzip the file size is not sutable.
          //response.setHeader('Content-Length', stats.size);

          var lastModified = stats.mtime.toUTCString();
          var ifModifiedSince = "If-Modified-Since".toLowerCase();
          response.setHeader("Last-Modified", lastModified);

          var expires = new Date();
          var maxAge = 3600 * 12 * 360 * 1000;
          expires.setTime(expires.getTime() + maxAge);
          response.setHeader("Expires", expires.toUTCString());
          response.setHeader("Cache-Control", "max-age=" + maxAge);

          if (request.headers[ifModifiedSince] && lastModified === request.headers[ifModifiedSince]) {
            response.writeHead(304, "Not Modified");
            console.log('304 not modified.');
            response.end();
          } else {
            var compressHandle = function (raw, statusCode, reasonPhrase) {
              var stream = raw;
              var acceptEncoding = request.headers['accept-encoding'] || "";
              var matched = true;//

              if (matched && acceptEncoding.match(/\bgzip\b/)) {
                response.setHeader("Content-Encoding", "gzip");
                stream = raw.pipe(zlib.createGzip());
              } else if (matched && acceptEncoding.match(/\bdeflate\b/)) {
                response.setHeader("Content-Encoding", "deflate");
                stream = raw.pipe(zlib.createDeflate());
              }
              response.writeHead(statusCode, reasonPhrase);
              stream.pipe(response);
            };

            var raw;
            if (request.headers["range"]) {
              var range = utils.parseRange(request.headers["range"], stats.size);
              if (range) {
                response.setHeader("Content-Range", "bytes " + range.start + "-" + range.end + "/" + stats.size);
                response.setHeader("Content-Length", (range.end - range.start + 1));
                raw = fs.createReadStream(request.filePath, {"start":range.start, "end":range.end});
                compressHandle(raw, 206, "Partial Content");
              } else {
                response.removeHeader("Content-Length");
                response.writeHead(416, "Request Range Not Satisfiable");
                response.end();
              }
            } else {
              raw = fs.createReadStream(request.filePath);
              compressHandle(raw, 200, "Ok");
            }
          }

        });

      } else {
        next();
      }
    },
    function (req, res) {
      console.error('url 404:', req.url);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('URI : "' + req.url + '" NOT crawled from www.nocancer.com.cn');
    }
).listen(config.port);
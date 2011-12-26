require('./config/config.js');

var server = require('http');
var connect = require('connect');
var fs = require('fs');
var path = require('path');

connect(
    connect.logger(':method :url - :res[content-type]', { buffer:5000 }),
    function (req, res, next) {
      console.log('req url:', req.url);
      var filePath = __dirname + '/www.nocancer.com.cn/' + req.url;
      path.exists(filePath, function (exists) {
        if (exists) {
          if (/^\/ucenter/.test(req.url)) {
            res.setHeader("Content-Type", "image/jpg");
            console.log('Read file:', filePath);
          }

          if (req.url === "/forum.php" || /forum.php\?gid/.test(req.url) || /^\/archiver\/\?/.test(req.url)) {
            res.setHeader("Content-Type", 'text/html; charset="utf-8"');
          }

          if (/^\/forum.php\?mod=attachment/.test(req.url)) {
            console.log('thread attachment:', filePath);
          }
          fs.createReadStream(filePath, {encoding:null, bufferSize:64 * 1024}).pipe(res);
        } else {
          res.statusCode = 404;
          res.end();
        }
      });
    },
    connect.static(__dirname + '/www.nocancer.com.cn', { maxAge:0 })
    ,
    function (req, res) {
      console.log("Error: call tail router.");
      res.setHeader('Content-Type', 'text/html');
      res.end('<img src="/tobi.jpeg" />')
    }
).listen(config.port);
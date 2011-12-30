require('./config/config.js');

var connect = require('connect');
var fs = require('fs');
var path = require('path');
var att = require('./attachment.js');

connect(
    connect.logger(':method :url - :res[content-type]', { buffer:5000 }),
    function (req, res, next) {
      if (/^\/forum.php\?mod=attachment&aid/.test(req.url)) {
        var url = 'http://www.nocancer.com.cn' + req.url;
        var filePath = att.getAttFilePath(url);
        path.exists(filePath, function (exists) {
          console.log('get attachment', filePath);
          exists && fs.createReadStream(filePath, {encoding:null, bufferSize:64 * 1024}).pipe(res);
        });
      } else {
        next();
      }
    },
    function (req, res, next) {
      console.log('req url:', req.url);
      if (req.url === '/') {
        req.url = '/forum.php';
      }
      var filePath = path.join(__dirname, '/www.nocancer.com.cn/', req.url);
      path.exists(filePath, function (exists) {
        if (exists) {
          if (/^\/ucenter/.test(req.url)) {
            res.setHeader("Content-Type", "image/jpg");
            console.log('Read file:', filePath);
          }

          if (req.url === "/forum.php" || /forum.php\?gid/.test(req.url) || /^\/archiver\/\?/.test(req.url)) {
            res.setHeader("Content-Type", 'text/html; charset="utf-8"');
          }
          fs.createReadStream(filePath, {encoding:null, bufferSize:64 * 1024}).pipe(res);
        } else {
          next();
        }
      });
    },
    function (req, res) {
      console.error('url 404:', req.url);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end('URI : "<i>' + req.url + '<\/i>" NOT crawled from www.nocancer.com.cn');
    }
).listen(config.port);
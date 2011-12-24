var http = require('http');
var options = { host:'www.nocancer.com.cn', port:80, path:'/forum.php' };
var Iconv = require('iconv').Iconv;
var gbk_to_utf8_iconv = new Iconv('GBK', 'UTF-8');
http.get(options,
         function (res) {
           console.log("Got response: " + res.statusCode);
           var buffers = [], size = 0;
           res.on('data', function (buffer) {
             buffers.push(buffer);
             size += buffer.length;
           });
           res.on('end', function () {
             var buffer = new Buffer(size), pos = 0;
             for (var i = 0, len = buffers.length; i < len; i++) {
               buffers[i].copy(buffer, pos);
               pos += buffers[i].length;
             }
             var utf8_buffer = gbk_to_utf8_iconv.convert(buffer);
             console.log(utf8_buffer.toString());
           });
         }).on('error', function (e) { console.log("Got error: " + e.message); });

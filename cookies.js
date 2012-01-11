//Copy from module: node-cookies.txt@github/mxfli

//This is a wget cookies.txt parser for nodejs
//Author:@mxfli
//date::2011年 12月 13日 星期二 13:33:06 UTC

var fs = require('fs');

var that = [];

/**
 * Parse cookies file and return the result to cb;
 */
function parse(file, cb) {
  fs.readFile(file, function (err, buffer) {
    if (err) { throw err;}

    var str = buffer.toString('utf8');

    //console.log('Cookies.txt content: \n', str);

    var cookies = str.split('\n');
    //console.log(cookies.length);
    var result = [], cookieDefine = ['domain', 'httponly', 'path', 'secure', 'expires', 'name', 'value'];

    cookies.forEach(function (line) {
      //console.log(index,':',line);
      line = line.trim();
      if (line.length > 0 && !/^#/.test(line)) {
        var cookie = {};
        line.split(/\s/).forEach(function (c, index) {
          if (cookieDefine[index] === 'expires') {c = (new Date(parseInt(c, 10) * 1000))}
          cookie[cookieDefine[index]] = c;
        });

        result.push(cookie);
      }

    });
    console.log("node-Cookies.txt load:", result.length, 'cookies.');
    that = result;
    cb && cb(result);
  });
}

module.exports.parse = parse;
module.exports.add = function (cookie) {
  that = that.filter(function (c) {
    // Avoid duplication (same path, same name)
    return !(c.name == cookie.name && c.path == cookie.path);
  });
  that.push(cookie);
};

module.exports.get = function () {return that};

module.exports.getCookieString = function () {
  var result = that.map(
      function (cookie) {
        return cookie['name'] + '=' + cookie['value'];
      }).join(';');

  console.log('Get cookies:', result);
  return result;
};

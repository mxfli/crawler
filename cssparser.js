/**
 * FileName: cssparser.js
 * Author: @mxfli
 * CreateTime: 2011-12-26 09:18
 * Description:
 *      Description of cssparser.js
 */
//TODO(Inaction) Add CSS import parse.
//TODO(Inaciton) Add this parser to crawler.

require("config/config.js");
var path = require('path');
var fs = require('fs');
var crawler = require('domCrawler.js');

console.log('Set process name :', config.appName);

process.title = config.appName + 'CSSParser';

var host = config.crawlOptions['host'] = 'www.nocancer.com.cn';
var baseURI = 'http://' + host;

console.log('Host:', host);

var baseDir = path.join(__dirname, host);
console.log('Base dir:', baseDir);

var cssDir = path.join(baseDir, 'data/cache');

console.log('CSS dir:', cssDir);

var cssPath = '/data/cache';
fs.readdir(cssDir, function (err, cssFiles) {
  if (err) {
    throw err;
  }
  console.log('CSS files:', cssFiles);
  cssFiles.forEach(function (cssFile) {
    console.log('Read CSS:', cssFile);
    fs.readFile(path.join(cssDir, cssFile), function (err, cssBuffer) {
      if (err) {
        throw err;
      }
      var cssStr = cssBuffer.toString('ascii');
      console.log("CSS", cssFile, 'loaded.');
      var urls = parseCSSUri(cssStr);
      console.log('CSS', cssFile, 'parse result:', urls ? urls.length : 0);
      urls && urls.forEach(function (uri, index) {
        var imgPath = path.join(cssPath, uri.replace('url(', '').replace(')', ''));
        var imgUri = baseURI + imgPath;
        crawler.push({uri: imgUri, type: 'img'});
        console.log('[' + index + ']', imgPath);
      });
    });
  });
});

var parseCSSUri = function (css) {
  var urlReg = /url\(.+?\)/ig;
  return css.match(urlReg);
};




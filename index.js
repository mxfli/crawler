/**
 * FileName: index.js
 * Author: @mxfli
 * CreateTime: 2011-12-05 23:29
 * Description:
 *      An example to use SmartCrawler.
 */

require("./config/config.js");

console.log('Set process name :', config.appName);

process.title = config.appName;

var ctp = require('../node-cookies.txt/index.js');
var crawler = require("./SmartCrawler.js");
var discuzX2Plugin = require('./plugins/discuzX2.js');

ctp.parse(__dirname + '/config/cookies.txt', function (cookies) {
  crawler.init({jar:ctp, callback:discuzX2Plugin, update:true});
  crawler.crawl('http://www.nocancer.com.cn/forum.php');
});

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

var ctp = require('cookies.txt/index.js');
var crawler = require("./SmartCrawler.js");
var discuzX2Plugin = require('./plugins/discuz/discuzX2.js');

//Load cookies
ctp.parse(__dirname + '/config/cookies.txt', function (cookies) {

  //Init crawler with options.
  crawler.init({jar:ctp, callback:discuzX2Plugin, update:true, updateFlag:1231});

  //Crawl the url
  crawler.crawl('http://www.nocancer.com.cn/forum.php');

  //Add other urls
  crawler.push('http://www.nocancer.com.cn/portal.php');
  crawler.push('http://www.nocancer.com.cn/thread-2070-1-1.html');
  //crawler.crawl('http://www.nocancer.com.cn/thread-9837-1-1.html');
//  crawler.crawl('http://www.nocancer.com.cn/thread-9493-1-1.html');
});

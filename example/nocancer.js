/**
 * FileName: index.js
 * Author: @mxfli
 * CreateTime: 2011-12-05 23:29
 * Description:
 *      An example to use domCrawler.
 */

require("../config/config.js");

var ctp = require('../../node-cookies.txt/index.js');
var crawler = require("../domCrawler.js");
var discuzX2Plugin = require('../plugins/discuz/discuzX2.js');

ctp.parse('./nocancer_cookies.txt', function (cookies) {
  crawler.init({jar:ctp, callback:discuzX2Plugin, update:true, updateFlag:1231});
  crawler.crawl('http://www.nocancer.com.cn/forum.php');
  //crawler.push('http://www.nocancer.com.cn/portal.php');
  //crawler.push('http://www.nocancer.com.cn/thread-2070-1-1.html');
  //crawler.crawl('http://www.nocancer.com.cn/thread-9837-1-1.html');
  //crawler.crawl('http://www.nocancer.com.cn/thread-9493-1-1.html');
});

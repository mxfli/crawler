/**
 * FileName: ngotcm.js
 * Author: @mxfli
 * CreateTime: 2012-01-04 19:32
 * Description:
 *     www.ngotcm.com 奇才贴 crawler.
 */

require('../config/config.js');
//Overide default options;
config.crawlOptions.working_root_path = __dirname + '/qicai';

var domCrawler = require('../domCrawler.js');
var cookieAgent = require('../../node-cookies.txt/index.js');
var qicaiThreadParser = function (window, $, callback) {
  //console.log('parse thread', window.location);
  $('a[href]').each(function (index, link) {
    //console.log('test url:', link.href);
    if (/thread-50247-\d{1,6}-\d{1,6}\.html$/ig.test(link.href)) {
      //console.log("Add url:", link.href, domCrawler.push({uri:link.href, type:'link'}));
      domCrawler.push({uri:link.href, type:'link'});
    }
  });
  callback && callback.call();
};

config.crawlOptions.recursive = false;

cookieAgent.parse(__dirname + '/ngotcm_cookies.txt', function () {
  domCrawler.init({jar:cookieAgent, callback:qicaiThreadParser, updateFlag:3});
  domCrawler.crawl('http://www.ngotcm.com/forum/thread-50247-1-1.html');
});

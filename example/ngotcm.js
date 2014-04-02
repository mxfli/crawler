/**
 * FileName: ngotcm.js
 * Author: @mxfli
 * CreateTime: 2012-01-04 19:32
 * Description:
 *     www.ngotcm.com 奇才贴 crawler.
 */

require('../config/config.js');
var path = require('path');

//Override configuration.
config.crawlOptions.working_root_path = path.join(__dirname, '../run/qicai');
config.crawlOptions.maxConnections = 2;
config.crawlOptions.resourceParser = require('../lib/plugins/qicai');

var domCrawler = require('../lib').domCrawler;

var cookieAgent = require('cookies.txt');

config.crawlOptions.recursive = false;

cookieAgent.parse(__dirname + '/ngotcm_cookies.txt', function (jar) {
  domCrawler.init({jar: jar, updateFlag: 5});
  domCrawler.crawl('http://www.ngotcm.com/forum/thread-50247-1-1.html');
});

/**
 * FileName: config.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 14:39
 * Description:
 *      Config of this nocancer app.
 */

var config = {
  port: '1231', //the date of www.nocancer.com.cn  shutting down.
  maxMemoryUsage: 500
};

config.crawlOptions = {
  maxConnections: 1, //default max crawling task count.
  maxRetryCount: 3, //The max fail/try count.
  requestTimeout: 30 * 1000,
  delayTime: 5 * 1000, //time between to crawl request.
  recursive: false, //search link resources in the crawled page, add links to crawlQueue
  working_root_path: 'run/crawler',
  inputEncoding: 'utf8', //force crawled page contant charset, if not setting in response.header;
  resourceParser: require('../lib/plugins/discuz'),
  page: 'http://www.discuz.net/forum-86-1.html',
  updateMode: false
};

//Default client http request options
config.requestOptions = {
  domain: 'en.wikipedia.org',
  port: 80,
  "Connection": 'keep-Alive',
  //cookie use cookie.txt
  Cookie: 'bdshare_firstime=1393155630905; Hm_lvt_23234f06c4cd9a705eb19ee58a9d4470=1396252553;',
  //Default user angent is google chrome 16
  "User-Agent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'
};

//add config to global
global.config = config;
console.log('App config options init: global["config"]');
//console.log('App config options:\n', config);

/**
 * FileName: config.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 14:39
 * Description:
 *      Config of this nocancer app.
 */

var config = {
  appName: '0Crawler',
  version: '0.0.3 alpha',
  port: '1231', //the date of nocancer.com will be shutting down.
  databaseName: 'nocancer',
  appDomain: 'localhost', //网站绑定的域名？也可以不用绑定，这个是灵活的，取决于在什么地址部署
  maxMemoryUsage: 500
};

config.crawlOptions = {
  maxConnections: 1,
  maxRetryCount: 3, //最大重试次数
  requestTimeout: 30 * 1000,
  savePoint: 50, //save data every 50 rui finished.
  recursive: true,
  updateFlag: true,
  working_root_path: '/tmp/crawler',
  inputEncoding: 'utf8'
};

//Default client http request options
config.requestOptions = {
  domain: '',
  port: 80,
  path: '/',
  "Connection": 'keep-Alive',
  "Accept-Encoding": 'gzip,deflate,sdch',
  //cookie use cookie.txt
  cookie: '',
  //Default user angent is google chrome 16
  "User-Agent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'
};

//add config to global
global.config = config;
console.log('App config options init: global["config"]');
//console.log('App config options:\n', config);


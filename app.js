"use strict";
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

var crawler = require("./lib").domCrawler;
var discuzX2Plugin = require('./lib/plugins/discuz/discuzX2.js');

var requestOptions = config.requestOptions;
if (requestOptions.cookie) {
  var cookies = require('cookies.txt');

  //Load cookies
  cookies.parse(__dirname + '/config/cookies.txt', function () {

    //Init crawler with options.
    crawler({jar: cookies, callback: discuzX2Plugin, update: true, updateFlag: 1231});

    //Crawl the url
    crawler.crawl(requestOptions.path);
  });
} else {
  //TODO updateFlag has a bug: if not seted ,first crawl will not bean started.
  crawler.init({jar: false, callback: discuzX2Plugin, update: true, updateFlag: 1330});
  crawler.crawl(requestOptions.path);
}

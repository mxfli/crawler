"use strict";
/**
 * FileName: index.js
 * Author: @mxfli
 * CreateTime: 2011-12-05 23:29
 * Description:
 *      An example to use SmartCrawler.
 */
require("./config/config.js");

var crawler = require("./lib").domCrawler;

crawler.init();
crawler.crawl(config.crawlOptions.page);

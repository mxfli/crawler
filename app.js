"use strict";
/**
 * Author: @mxfli
 * CreateTime: 2011-12-05 23:29
 * Description:
 *      An example to use crawlit.
 */
require("./config/config.js");
try{
  require('./config.local.js');
}catch(e){
  console.log('No local config, using default');
}

var crawler = require("./lib").crawler;

crawler.init();
crawler.crawl(config.crawlOptions.page);

/**
 * FileName: szhbbs.js.js
 * Author: @mxfli
 * CreateTime: 2011-12-19 16:06
 * Description:
 *      Description of szhbbs.js.js
 */

require("./config/config.js");
var ctp = require('../node-cookies.txt/index.js');
var crawler = require("./SmartCrawler.js");
var discuzX2Plugin = require('./plugins/discuzX2.js');

ctp.parse(__dirname + '/config/szhbbscookies.txt', function (cookies) {
  crawler.init({jar:ctp, callback:discuzX2Plugin})
      .crawl('http://szhbbs.mxfli.com:8080/forum.php');
});


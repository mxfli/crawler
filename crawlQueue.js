/**
 * FileName: crawlQueue.js
 * Author: @mxfli
 * CreateTime: 2011-12-26 20:05
 * Description:
 *      Description of crawlQueue.js
 */

var fs = require('fs');
var util = require('util');
var path = require('path');


var crawlQueue = (function () {
  var queue = [];             // {uri:'http://www.nocancer.com.cn', type:'link'}
  var processingStack = {};   // "_uri_example":'http://www.nocancer.com.cn/forum.php'};
  var failedStack = {};       // "_uri_example":{uri:'http://www.nocancer.com.cn/forum.php', failedCount:4}
  var finishedStack = {};     // "_uri_example":{uri:"http:www.nocancer.com.cn/lkjldjf.html", meta:{"content-type":"image"}}

  var finishedDumFile = __dirname + '/finished.json';
  var failedDumFile = __dirname + '/failed.json';
  var queueDumFile = __dirname + '/queue.json';
  var processDumFile = __dirname + '/process.json';

  var loadQueue = function () {
    if (path.existsSync(finishedDumFile)) {
      finishedStack = JSON.parse(fs.readFileSync(finishedDumFile).toString());
    }
    if (path.existsSync(queueDumFile)) {
      queue = JSON.parse(fs.readFileSync(queueDumFile).toString());
    }
    if (path.existsSync(failedDumFile)) {
      failedStack = JSON.parse(fs.readFileSync(failedDumFile).toString());
      for (var j in failedStack) {
        failedStack[j].failedCount = 0;
        queue.unshift(failedStack[j]);
      }
      failedStack = {};
    }
    if (path.existsSync(processDumFile)) {
      processingStack = JSON.parse(fs.readFileSync(processDumFile).toString());
      for (var i in processingStack) {
        queue.push(processingStack[i]);
      }
      processingStack = {};
    }
    queueInfo();
  };

  var dumpQueue = function () {

    function dump() {
      if (queue.length === 0 && Object.keys(processingStack).length === 0) {
        if (retry > 2) {
          clearInterval(timer);
          console.log('queue is empty Exit dump Queue listener....');
          return;
        } else {
          retry += 1;
          console.log('queue is empty retry:', retry);
        }
      }

      if (Object.keys(processingStack).length < config.crawlOptions.maxConnections && queue.length > 0) {
        var uriObj = queue.pop();
        processingStack[uriObj.uri] = uriObj;
        process.nextTick(crawler.bind(null, uriObj));
      }

      console.log('Dumping queue...');

      //push processing to queue.
      //Object.keys(processingStack).forEach(function (key) { queue.push(processingStack[key]); });
      fs.writeFileSync(finishedDumFile, JSON.stringify(finishedStack));
      //console.log("dump fishedStack");
      fs.writeFileSync(failedDumFile, JSON.stringify(failedStack));
      //console.log('dum failedStack');
      fs.writeFileSync(queueDumFile, JSON.stringify(queue));
      //console.log('dum queueStack');
      fs.writeFileSync(processDumFile, JSON.stringify(processingStack));

      queueInfo();
      console.log('Dump queue ok.');
      var memUsage = process.memoryUsage().rss / (1024 * 1024);
      console.log('Memory usage:', memUsage.toFixed(2), 'Mb');
      if (memUsage > 400) {
        console.log("Over max memory usage, exit process.");
        process.exit(1);
      }
    }

    var retry = 0;
    var timer = setInterval(dump, 5 * 1000);
  };

  var queueInfo = function () {
    console.log('Queue:', queue.length,
                '; processing:', Object.keys(processingStack).length,
                '; Finished:', Object.keys(finishedStack).length,
                '; Failed:', Object.keys(failedStack).length);
  };

  var regxp = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
  var isURL = function (uri) {
    var result = regxp.test(uri);
    if (!result) console.error('push link err:', uri);
    return result;
  };

  var isLastThread = function (link) {
    var isLast = false;
    isLast = /forum\.php$/.test(link);

    if (/thread-.+?-.+?-.+?\.html/.test(link) && finishedStack[link]) {
      var linkArray = link.split("-");
      linkArray[2] = parseInt(linkArray[2]) + 1;
      isLast = !!!finishedStack[linkArray.join("")];
    }
    return isLast;
  };

  loadQueue();
  dumpQueue();

  var that = {};
  var crawler = false;
  that.setCrawler = function (_crawler) {
    crawler = _crawler;
  };

  that.push = function (url) {
    var uri = {type:'link'};
    if (typeof url === 'string') {
      uri.uri = url;
    } else {
      //copy properties from url object.
      uri.uri = url.uri;
      uri.type = url.type;
      uri.failedCount = url.failedCount ? url.failedCount : 0;
    }

    var link = uri.uri;
    if (uri.type !== 'link' && link.indexOf('http') < 0) {
      uri.uri = link = 'http://' + config.crawlOptions['host'] + '/' + link;
    }
    var isExcludedLink = /51\.la/.test(link);
    var isInQueue = queue.some(function (e) {return e.uri === link });
    if ((config.requestOptions.update && uri.type === 'link' && isLastThread(link)) || !(!isURL(link) || isInQueue || isExcludedLink || (link in failedStack && failedStack[link].failedCount > config.crawlOptions.maxRetryCount) || link in processingStack || link in finishedStack)) {
      if (link !== 'http://www.nocancer.com.cn/') {
        crawlQueue.push(uri);
      }
    }
  };

  that.next = function () {return queue.shift()};
  var reCrawled = function () {};
  that.crawled = function (uriObj) {
    finishedStack[uriObj.uri] = true;
    delete processingStack[uriObj.uri];
  };
  that.failed = function (uriObj) {
    uriObj.failedCount = uriObj.failedCount + 1;
    failedStack[uri] = uriObj;

    delete processingStack[uri];
    uriObj.failedCount < config.crawlOptions.maxRetryCount && queue.push(uriObj);
  };

  return that;

})();

module.exports = crawlQueue;
"use strict";
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var console = require('./logger').getLogger('info');
var utilBox = require('./utilbox.js');
console.log = console.info;

var crawlOptions = global.config.crawlOptions;
var maxRetryCount = crawlOptions.maxRetryCount;
var queueConfig = {
  warnMem: 150,
  maxMem: 300,
  maxConnections: crawlOptions.maxConnections,
  crawlingTaskCount: 0,
  updateMode: crawlOptions.updateMode
};

var QUEUE_STATUS = {
  PREPARE: 0,
  UPDATE: 5,
  RETRY: 1,
  PROCESS: 2,
  CRAWLED: 3,
  FAILED: 4
};

//Init queue names by QUEUE_STATUS
var QUEUE_NAMES = new Array(QUEUE_STATUS.length);
Object.keys(QUEUE_STATUS).forEach(function (key) {
  QUEUE_NAMES[QUEUE_STATUS[key]] = key;
});

//crawl objects queue data cache.
var QUEUE = [];

var crawlQueue = function (baseDir, crawl) {
  var that = {};

  var queueDumFile = path.join(baseDir, 'queue.json');

  function queueInfo() {
    var infoObj = { "Total": QUEUE.length};
    Object.keys(QUEUE_STATUS).forEach(function (key) {
      infoObj[key] = 0;
    });
    QUEUE.forEach(function info(uriObj) {
      infoObj[QUEUE_NAMES[uriObj.status]] += 1;
    });
    console.info('Crawling Queue Info: \n', Object.keys(infoObj).map(function (i) {
      return [i , infoObj[i]].join('=');
    }).join(' | '));
  }

  /**
   * load queue data and stacks data.
   */
  that.loadQueue = function () {
    assert(queueDumFile);
    QUEUE = utilBox.loadJSON(queueDumFile, []);
    QUEUE.forEach(function (uriObj) {
      if (uriObj.status === QUEUE_STATUS.PROCESS) {
        process.nextTick(crawl.bind(null, uriObj));
        queueConfig.crawlingTaskCount += 1;
      }
      if (queueConfig.updateMode && uriObj.status === QUEUE_STATUS.CRAWLED && uriObj.type === 'link') {
        uriObj.status = QUEUE_STATUS.UPDATE;
      }
    });
    assert(Array.isArray(QUEUE));
  };

  that.dumpQueue = function () {
    //real dum function
    var dump = function () {
      /**
       * 1. 同一个页面内的资源优先下载，类似浏览行为
       * 2. 失败的资源优先下载？
       * 3. link类型的资源要有时间间隔
       */

      var memUsage = process.memoryUsage().rss / (1024 * 1024);

      var next = function () {
        var count = 0;
        QUEUE.some(function (uriObj) {
          if (uriObj.status === QUEUE_STATUS.PROCESS) {
            count += 1;
          }

          if (memUsage < queueConfig.maxMem &&
              queueConfig.crawlingTaskCount < queueConfig.maxConnections &&
              ( uriObj.status === QUEUE_STATUS.PREPARE ||
                  (uriObj.status === QUEUE_STATUS.RETRY && uriObj.failedCount < maxRetryCount) ||
                  (uriObj.status === QUEUE_STATUS.UPDATE && queueConfig.updateMode) )) {

            setImmediate(crawl.bind(null, uriObj));
            //process.nextTick(crawl.bind(null, uriObj));
            uriObj.status = QUEUE_STATUS.PROCESS;
            count += 1;
            queueConfig.crawlingTaskCount += 1;
            return queueConfig.crawlingTaskCount >= queueConfig.maxConnections;
          }
        });
        queueConfig.crawlingTaskCount = count;

        if (queueConfig.crawlingTaskCount === 0) {
          if (retry > 0) {
            clearInterval(timer);
            console.log('queue is empty Exit dump Queue listener....');
          } else {
            retry += 1;
            console.log('queue is empty retry:', retry);
          }
        }
      };
      next();

      console.log('Dumping queue...');

      fs.writeFileSync(queueDumFile, JSON.stringify(QUEUE, null, 2));

      console.log('Dump queue ok.');
      queueInfo();


      console.log('Memory usage:', memUsage.toFixed(2), 'Mb');
      if (memUsage > queueConfig.warnMem) {
        console.warn('Memory leaking, usage:', memUsage);
      }
      if (memUsage > queueConfig.maxMem && queueConfig.crawlingTaskCount === 0) {
        console.error("Over max memory usage, exit process.");
        process.exit(1);
      }
    };

    var retry = 0;
    //TODO Update and dump queue by Event driven, remove setInterval() calling..
    var timer = setInterval(dump, 8 * 1000);
  };

  /**
   *
   * @param uriObj Object: {
   * uri:uri,
   * type:[attachment,css,link.img],
   * status: @see QUEUE_STATUS
   * failedCount:3,
   */
  that.push = function (uriObj) {
    var uriObjInQueue = Object.create(null);
    utilBox.copyProperites(uriObjInQueue, uriObj);
    assert.ok(uriObjInQueue);
    uriObjInQueue.failedCount = uriObjInQueue.failedCount || 0;
    uriObjInQueue.status = uriObjInQueue.status || QUEUE_STATUS.PREPARE;
    var link = uriObjInQueue.uri;
    assert(link);
    assert('link css img css js attachment'.split(' ').indexOf(uriObjInQueue.type) !== -1);
    assert(uriObjInQueue.failedCount >= 0);
    assert(uriObjInQueue.status >= 0);
    assert(uriObjInQueue.filename);

    if (!QUEUE.some(function (_uriObj) {
      return _uriObj.filename === uriObj.filename;
    })) {
      console.info('Push link:', link);
      QUEUE.push(uriObjInQueue);
    }
  };

  that.finish = function (uriObj) {
    uriObj.status = QUEUE_STATUS.CRAWLED;
    queueConfig.crawlingTaskCount -= 1;
  };

  that.fail = function (uriObj) {
    uriObj.failedCount += 1;
    if (uriObj.failedCount >= maxRetryCount) {
      uriObj.status = QUEUE_STATUS.FAILED;
    } else {
      uriObj.status = QUEUE_STATUS.RETRY;
    }
    queueConfig.crawlingTaskCount -= 1;
  };

  that.update = function (uri) {
    QUEUE.forEach(function(uriObj){
      if(uriObj.uri.indexOf(uri) !== -1){
        uriObj.status = QUEUE_STATUS.UPDATE;
      }
    });
  };

  return that;
};

module.exports = crawlQueue;

"use strict";
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var console = require('./logger').getLogger('info');
var utilBox = require('./utilbox.js');
console.log = console.info;

var maxRetryCount = config.crawlOptions.maxRetryCount;
var queueConfig = {
  warnMem: 150,
  maxMem: 500,
  maxConnections: 2,
  crawlingTaskCount: 0
};

var QUEUE_STATUS = {
  PREPARE: 0,
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

var crawlQueue = function (baseDir, crawl) {
  var QUEUE = [];
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
      var next = function () {
        var count = 0;
        QUEUE.some(function (uriObj) {
          if (uriObj.status === QUEUE_STATUS.PROCESS) {
            count += 1;
          }

          if (queueConfig.crawlingTaskCount < queueConfig.maxConnections &&
              (uriObj.status === QUEUE_STATUS.PREPARE ||
                  uriObj.status === QUEUE_STATUS.RETRY && uriObj.failedCount < maxRetryCount)) {

            process.nextTick(crawl.bind(null, uriObj));
            uriObj.status = QUEUE_STATUS.PROCESS;
            count += 1;
            queueConfig.crawlingTaskCount += 1;
            return queueConfig.crawlingTaskCount >= queueConfig.maxConnections;
          }
        });
        queueConfig.crawlingTaskCount = count;

        if (queueConfig.crawlingTaskCount === 0) {
          if (retry > 2) {
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

      var memUsage = process.memoryUsage().rss / (1024 * 1024);

      console.log('Memory usage:', memUsage.toFixed(2), 'Mb');
      if (memUsage > queueConfig.warnMem) {
        console.warn('Memory leaking, usage:', memUsage);
      }
      if (memUsage > queueConfig.maxMem) {
        console.error("Over max memory usage, exit process.");
        process.exit(1);
      }
    };

    var retry = 0;
    //TODO Update and dump queue by Event driven, remove setInterval() calling..
    //TODO Chek memory leak here.
    var timer = setInterval(dump, 5 * 1000);
  };

  /**
   *
   * @param uriObj Object: {
   * uri:uri,
   * type:[attachment,css,link.img],
   * status:0:未开始 1:更新, 2:Retry 3：进行中,4:成功,5:失败，
   * failedCount:3,
   * updateFlag:anyeType}
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
      //TODO Need update crawl return true;
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

  return that;
};

module.exports = crawlQueue;

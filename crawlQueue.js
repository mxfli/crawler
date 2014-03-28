var fs = require('fs');
var path = require('path');

var crawlQueue = function (baseDir, crawl) {
  var queue = {queue: [], processingStack: {}, finishedStack: {}, failedStack: {}};
  var that = {};
  //var files = {queue:[]};
  var dataFiles = {
    finishedDumFile: path.join(baseDir, 'finished.json'),
    failedDumFile: path.join(baseDir, 'failed.json'),
    processDumFile: path.join(baseDir, 'process.json'),
    queueDumFile: path.join(baseDir, 'queue.json')
  };

  function queueInfo() {
    console.log(
        'Queue:', queue.queue.length,
        '; processing:', Object.keys(queue.processingStack).length,
        '; Finished:', Object.keys(queue.finishedStack).length,
        '; Failed:', Object.keys(queue.failedStack).length);
  }

  /**
   * load queue data and stacks data.
   */
  that.loadQueue = function () {
    var loadJson = function (fileName, defaultValue) {
      console.log('Load JSON:', fileName);
      if (path.existsSync(fileName)) {
        return JSON.parse(fs.readFileSync(fileName).toString()) || defaultValue || {};
      } else {
        return defaultValue || {};
      }
    };

    queue.finishedStack = loadJson.call(null, dataFiles.finishedDumFile, {});
    queue.queue = loadJson.call(null, dataFiles.queueDumFile, []);
    queue.failedStack = loadJson(dataFiles.failedDumFile, {});
    var _processingStack = loadJson(dataFiles.processDumFile, {});
    //将上次正在处理的uri加载到队列的开始。
    Object.keys(_processingStack).forEach(function (uri) {
      queue.queue.unshift(_processingStack[uri])
    });
    //Object.keys(failedStack).forEach(function (uri) {queue.unshift(failedStack[uri])});
  };

  that.dumpQueue = function () {
    //real dum function
    function dump() {
      if (queue.queue.length === 0 && Object.keys(queue.processingStack).length === 0) {
        if (retry > 2) {
          clearInterval(timer);
          console.log('queue is empty Exit dump Queue listener....');
          return;
        } else {
          retry += 1;
          console.log('queue is empty retry:', retry);
        }
      }

      var next = function () {
        if (Object.keys(queue.processingStack).length < config.crawlOptions.maxConnections && queue.queue.length > 0) {

          var uriObj = queue.queue.shift();
          process.nextTick(crawl.bind(null, uriObj));
          queue.processingStack[uriObj.uri] = uriObj;
          //continue crawl to max processing size;
          next();
        }
      };
      next();

      console.log('Dumping queue...');

      //push processing to queue.
      fs.writeFileSync(dataFiles.finishedDumFile, JSON.stringify(queue.finishedStack));
      //console.log("dump fishedStack");
      fs.writeFileSync(dataFiles.failedDumFile, JSON.stringify(queue.failedStack));
      //console.log('dum failedStack');
      fs.writeFileSync(dataFiles.queueDumFile, JSON.stringify(queue.queue));
      //console.log('dum queueStack');
      fs.writeFileSync(dataFiles.processDumFile, JSON.stringify(queue.processingStack));

      console.log('Dump queue ok.');
      queueInfo();
      var memUsage = process.memoryUsage().rss / (1024 * 1024);
      console.log('Memory usage:', memUsage.toFixed(2), 'Mb');
      if (memUsage > 390) {
        console.log("Over max memory usage, exit process.");
        process.exit(1);
      }
    }

    var retry = 0;
    var timer = setInterval(dump, 5 * 1000);
  };

  that.push = function (uriObj) {
    var link = uriObj.uri;
    // Need update crawl return true;
    var isNeedUpdate = function (uri) {
      if (uri.type === 'link') {
        return queue.finishedStack[link] !== config.requestOptions.updateFlag;
      } else if (uri.type !== 'attachment') {
        return !(link in queue.finishedStack);
      } else { // attachements is out side.
        return true;
      }
    };

    // exit
    var isMaxFiled = (link in queue.failedStack) && queue.failedStack[link].failedCount > config.crawlOptions.maxRetryCount;
    if (isMaxFiled) {
      return;
    }

    if (!isNeedUpdate(uriObj)) {
      return;
    }

    if (uriObj.uri in queue.processingStack) {
      return;
    }
    if (!queue.queue.some(function (e) {
      return e.uri === link;
    })) {
      queue.queue.push(uriObj);
    }
  };

  that.finish = function (uriObj) {
    delete queue.processingStack[uriObj.uri];
    if (uriObj.type !== 'attachment') {
      queue.finishedStack[uriObj.uri] = config.crawlOptions.updateFlag;
    }
  };

  that.fail = function (uriObj) {
    delete queue.processingStack[uriObj.uri];
    uriObj.failedCount += 1;
    queue.failedStack[uriObj.uri] = uriObj;
    if (uriObj.failedCount < config.crawlOptions.maxRetryCount) {
      queue.queue.unshift(uriObj);
    }
  };
  return that;
};

module.exports = crawlQueue;

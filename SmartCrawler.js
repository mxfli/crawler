/**
 * FileName: SmartCrawler.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 23:51
 * Description:
 *     Smart crawler of using rquest.pipe
 */
var requestPipe = require('request');
var requestIconv = require('./request-iconv.js');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var utilBox = require('./utilbox.js');
var attchments = require('./attachment.js');

//Load jQuery source code to string.
var jQuerySrc = fs.readFileSync('./jquery/jquery-1.7.1.min.js').toString();
//var updated = 3;

var requestOptions = config.requestOptions;

//uri types: link, img, attachment {uri:'',type:'',failedCount:0}
var queue = [];
var processingStack = {};
var failedStack = {};
var finishedStack = {};

var finishedDumFile = __dirname + '/finished.json';
var failedDumFile = __dirname + '/failed.json';
var queueDumFile = __dirname + '/queue.json';
var processDumFile = __dirname + '/process.json';

var loadQueue = function () {
  var loadJson = function (fileName, defaultValue) {
    if (path.existsSync(fileName)) {
      return JSON.parse(fs.readFileSync(fileName).toString()) || defaultValue || {};
    } else {
      return defaultValue || {};
    }
  };

  finishedStack = loadJson.call(null, finishedDumFile, {});
  queue = loadJson.call(null, queueDumFile, []);
  failedStack = loadJson(failedDumFile, {});
  var _processingStack = loadJson(processDumFile, {});
  //将上次正在处理的uri加载到队列的开始。
  Object.keys(_processingStack).forEach(function (uri) {
    queue.unshift(_processingStack[uri])
  });
  //Object.keys(failedStack).forEach(function (uri) {queue.unshift(failedStack[uri])});
};

loadQueue();

function dumpQueue() {
  //real dum function
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

    if (Object.keys(processingStack).length === 0 && queue.length > 0) {
      process.nextTick(crawl);
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
}


var getFilePath = function (uriObj) {
  var baseName, uri = uriObj.uri;
  if (uriObj.type === "attachment") {
    return attchments.getAttFilePath(uri);
  }

  if (/(css)|(js)/.test(uriObj.type)) {
    baseName = URL.parse(uri).pathname;
  } else {
    baseName = URL.parse(uri).path;
  }
  if (/\/$/.test(baseName)) {
    baseName = path.join(baseName, 'index.html');
  }
  return path.join(__dirname, config.crawlOptions['host'], baseName);
};

function queueInfo() {
  console.log('Queue:', queue.length,
      '; processing:', Object.keys(processingStack).length,
      '; Finished:', Object.keys(finishedStack).length,
      '; Failed:', Object.keys(failedStack).length);
}
/**
 * Start the crawling the URIs in queue array.
 */
function crawl() {
  var processingSize = Object.keys(processingStack).length;
  if (queue.length === 0 || processingSize >= config.crawlOptions.maxConnections) {
    //console.log("Over max connections size:", config.crawlOptions.maxConnections, ', skip crawl.');
    return;
  }

  if (processingSize < config.crawlOptions.maxConnections) {
    process.nextTick(crawl);
  }

  var uriObj = queue.shift();
  var uri = uriObj['uri'];

  processingStack[uri] = uriObj;

  //queueInfo();

  //TODO(@Inaction) 不能直接使用pipe了。需要像connect一样有多个router顺序判断来执行。
  console.log("Crawl   :", uri);

  var filePath = getFilePath(uriObj);

  //console.log('File', filePath);


  utilBox.preparePath(path.dirname(filePath));

  if (uriObj.type !== "link") {
    //console.log('Pipe download:', uri);
    requestPipe.get({uri: uri, jar: requestOptions.jar}, pipeCallback).pipe(fs.createWriteStream(filePath));

    function pipeCallback(err) {
      console.log('Crawled', err ? 'ERROR :' : ':', uri);
      delete processingStack[uri];
      if (err) {
        uriObj.failedCount = 5;
        failedStack[uri] = uriObj;
      } else {
        //console.log("Pipe save:", filePath);
        (uriObj.type !== 'attachment') && (finishedStack[uri] = requestOptions['updateFlag']);
      }
      process.nextTick(crawl);
    }
  } else {
    requestIconv({uri: uri, headers: {"User-Agent": 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'}, jar: requestOptions.jar}, iconvCallback);
    function iconvCallback(err, response, body) {
      if (err) {
        tailFunction(err);
      } else if (Buffer.isBuffer(body)) {
        //没有经过转码的由buffer进行保存，直接输出
        fs.writeFile(filePath, body, tailFunction);
      } else {
        fs.writeFile(filePath, body
            .replace(/www\.nocancer\.com\.cn/g, 'nocancer.inaction.me')
            .replace('3836526', '6089389').replace(/undefined$/, ''), 'utf8', function (err) {
          if (err) {
            tailFunction(err);
            return;
          }
          if (requestOptions.callback && /(html|xml)/.test(response.headers['content-type'])) {
            //console.log("Build DOM :", uri);

            //remove all scripts
            body = body.replace(/<script.*?>.*?<\/script>/ig, '');

            //TODO(mxfli) memory leak here?
            require('jsdom').env(
                {html: body, src: [jQuerySrc],
                  done: function (err, window) {
                    if (err) {
                      tailFunction(err);
                      return;
                    }
                    //console.log('Parse HTML :', uri);
                    requestOptions.callback(window, window.$, tailFunction, requestOptions['updateFlag']);
                  }
                }
            );
          }
        });
      }
      //错误的防盗错误队列进行处理
      function tailFunction(err) {
        console.error('Crawled', err ? 'ERROR :' : ':', uri);
        delete processingStack[uri];
        if (err) {
          if (failedStack[uri]) {
            uriObj.failedCount = uriObj.failedCount + 1;
            failedStack[uri] = uriObj;
          } else {
            uriObj.failedCount = 1;
            failedStack[uri] = uriObj;
          }
          (uriObj.failedCount < config.crawlOptions.maxRetryCount) && crawler.push(uriObj);
        } else if (response.statusCode > 400) {
          uriObj.failedCount = config.crawlOptions.maxRetryCount;
          failedStack[uri] = uriObj;
        } else {
          (uriObj.type !== 'attachment') && (finishedStack[uri] = requestOptions['updateFlag']);
        }

        process.nextTick(crawl);
      }

    }

  }
}


function isURL(uri) {
  var regxp = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
  //if (!regxp.test(uri)) console.error('push link err:', uri);
  return regxp.test(uri);
}

var isNeedUpdate = function (link) {
  //return (/(group-.+?-.+?\.html|archiver\/\?.+?.html|thread-.+?-.+?-.+?\.html|forum.+?\.html|forum.php|group.php)$/.test(link)
  return /nocancer\.com\.cn/.test(link) && (finishedStack[link] !== requestOptions['updateFlag']);
};

var crawler = function crawler() {
  var that = {};

  that.push = function (url) {
    var uri = {type: 'link'};
    if (typeof url === 'string') {
      uri.uri = url;
      uri.failedCount = 0;
    } else {
      //copy properties from url object.
      uri.uri = url.uri;
      uri.type = url.type || 'link';
      uri.failedCount = url.failedCount ? url.failedCount : 0;
    }


    var link = uri.uri;
    if (uri.type !== 'link' && link.indexOf('http') < 0) {
      uri.uri = link = 'http://' + config.crawlOptions['host'] + '/' + link;
    }

    if (!isURL(link)) {
      return false;
    } //is not url exit

    //51.la exit
    var isExcludedLink = /(51\.la)|(bbs\.jhnews\.com\.cn)|(nocancer\.com\.cn:8080\/)/.test(link);
    if (isExcludedLink) {
      return false;
    }

    // in queue exit
    var isInQueue = queue.some(function (e) {
      return e.uri === link
    });
    if (isInQueue) {
      return false;
    }

    // exit
    var isMaxFiled = (link in failedStack) && failedStack[link].failedCount > config.crawlOptions.maxRetryCount;
    if (isMaxFiled) {
      return false;
    }

    if (link in processingStack) {
      return false;
    }

    //attachment exists exit
    if (uri.type === 'attachment' && attchments.exists(link)) {
      //console.log('Skip attachment', link);
      return false;
    } else {
      //console.log('attachment not exists,continue download.');
    }

    if (uri.type === 'link') {
      if (!isNeedUpdate(link)) {
        return false;
      }
    } else if (uri.type !== 'attachment') {
      if (link in finishedStack) {
        return false;
      }
    }
    queue.push(uri);
    return true;
  };


  /**
   * Init crawler options for request.
   * @param options
   */
  that.init = function (options) {
    for (var i in options) {
      requestOptions[i] = options[i];
    }
    return that;
  };

  /**
   * Add base uri to crawl
   * @param baseURI  uri to crawl
   */
  that.crawl = function (baseURI) {
    var url = URL.parse(baseURI);
    config.crawlOptions['host'] = url.hostname;
    console.log('Add domain for base uri:', config.crawlOptions['host']);

    //Default use disk, options use plugin for db:mongodb
    if (!path.existsSync(config.crawlOptions['host'])) {
      fs.mkdirSync(config.crawlOptions['host']);
      console.log('mkdir : ', config.crawlOptions['host']);
    }


    that.push({uri: baseURI, type: 'link', failedCount: 0 });
    process.nextTick(crawl);
    dumpQueue();
  };


  return that;
}();

module.exports = crawler;

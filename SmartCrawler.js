/**
 * FileName: SmartCrawler.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 23:51
 * Description:
 *     Smart crawler of using rquest.pipe
 */
var requestPipe = require('./request.pipe.js');
var requestIconv = require('./request-iconv.js');
var fs = require('fs');
var URL = require('url');
var util = require('util');
var path = require('path');
var jsdom = require('jsdom');

//Load jQuery source code to string.
var jQuerySrc = fs.readFileSync('./jquery/jquery-1.7.1.min.js').toString();

var requestOptions = config.requestOptions;

//uri types: link, img, attachement
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
};

loadQueue();

function dumpQueue() {

  function dump() {
    if (queue.length === 0) {
      if (retry > 2) {
        clearInterval(timer);
        console.log('queue is empty Exit dump Queue listener....');
        return;
      } else {
        retry += 1;
        console.log('queue is empty retry:', retry);
      }
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
    var memUsage = process.memoryUsage().rss / (1024 * 1024);
    console.log('Memory usage:', memUsage, 'Mb');
    if (memUsage > 400) {
      console.log("Over max memory usage, exit process.");
      process.exit(1);
    }
  }

  var retry = 0;
  var timer = setInterval(dump, 5 * 1000);
}

dumpQueue();


/**
 * Start the crawling the URIs in queue array.
 */
function crawl() {
  var processingSize = Object.keys(processingStack).length;
  if (queue.length === 0 || processingSize >= config.crawlOptions.maxConnections) {
    //console.log("Over max connections size:", config.crawlOptions.maxConnections, ', skip crawl.');
    return;
  }

  if (processingSize < config.crawlOptions.maxConnections) {process.nextTick(crawl);}

  var uriObj = queue.pop();
  var uri = uriObj['uri'];

  processingStack[uri] = uriObj;

  console.log('Queue:', queue.length,
              '; processing:', Object.keys(processingStack).length,
              '; Finished:', Object.keys(finishedStack).length,
              '; Failed:', Object.keys(failedStack).length);

  //TODO(@Inaction) 不能直接使用pipe了。需要像connect一样有多个router顺序判断来执行。
  console.log("Crawl uri:", uri);
  var filePath = path.join(__dirname, config.crawlOptions['host'], path.basename(URL.parse(uri).path));

  if (uriObj.type !== "link") {
    console.log('Pipe download:', uri);
    requestPipe.get({uri:uri, jar:requestOptions.jar}, pipeCallback).pipe(fs.createWriteStream(filePath));

    function pipeCallback(err) {
      if (err) {
        console.log("piped download err:", uri);
        uriObj.failedCount = 5;
        failedStack[uri] = uriObj;
      } else {
        console.log("Pipe save:", filePath);
        delete processingStack[uri];
        finishedStack[uri] = true;
      }
      process.nextTick(crawl);
    }
  } else {
    requestIconv({uri:uri,headers:{"User-Agent":'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'}, jar:requestOptions.jar}, iconvCallback);
    function iconvCallback(err, response, body) {
      if (err) {
        tailFunction(err);
      } else if (Buffer.isBuffer(body)) {
        //没有经过转码的由buffer进行保存，直接输出
        fs.writeFile(filePath, body, tailFunction);
      } else {
        fs.writeFile(filePath, body, 'utf8', function (err) {
          if (err) {
            tailFunction(err);
            return;
          }
          if (requestOptions.callback && /(html|xml)/.test(response.headers['content-type'])) {
            console.log("Build DOM :", uri);

            //Very ugly code to disable script
            jsdom.env({html:body.replace("script>", "sscript>"), src:[jQuerySrc],
                        done:function (err, window) {
                          if (err) {
                            tailFunction(err);
                            return;
                          }
                          console.log('Parse HTML :', uri);
                          requestOptions.callback(window, window.$, tailFunction);
                        }});

          }
        });
      }
      //错误的防盗错误队列进行处理
      function tailFunction(err) {
        if (err) {
          console.error('err:', err);
          if (failedStack[uri]) {
            uriObj.failedCount = uriObj.failedCount + 1;
            failedStack[uri] = uriObj;
          } else {
            uriObj.failedCount = 1;
            failedStack[uri] = uriObj;
          }
          delete processingStack[uri];
          uriObj.failedCount < config.crawlOptions.maxRetryCount && crawler.push(uriObj);
        } else if (response.statusCode > 400) {
          uriObj.failedCount = config.crawlOptions.maxRetryCount; //TODO(Inaction) use config.js value
          failedStack[uri] = uriObj;
        } else {
          finishedStack[uri] = true;
        }
        delete processingStack[uri];

        process.nextTick(crawl);
      }

    }

  }
}


function isURL(uri) {
  var regxp = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
  if (!regxp.test(uri)) console.error('push link err:', uri);
  return regxp.test(uri);
}


var crawler = function crawler() {
  var that = {};

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
    if (!(!isURL(link) || isInQueue || isExcludedLink || (link in failedStack && failedStack[link].failedCount > config.crawlOptions.maxRetryCount) || link in processingStack || link in finishedStack)) {
      if (link !== 'http://www.nocancer.com.cn/') {
        queue.push(uri);
      }
    }
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

    that.push({uri:baseURI, type:'link', isBase:true});
    process.nextTick(crawl);
  };


  return that;
}();

module.exports = crawler;

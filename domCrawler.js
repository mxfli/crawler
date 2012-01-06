/**
 * FileName: SmartCrawler.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 23:51
 * Description:
 *     Smart crawler of using rquest.pipe
 */
var request = require('request');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var Iconv = require('iconv').Iconv;
var utilBox = require('./utilbox.js');
//TODO(Inaction) use attachement as discuz plugin.
var attchments = require('./plugins/discuz/attachment.js');

//Load jQuery source code to string.
var jQuerySrc = fs.readFileSync(path.join(__dirname, 'jquery/jquery-1.7.1.min.js')).toString();

var working_root_path = config.crawlOptions.working_root_path;
utilBox.preparePath(working_root_path);
var requestOptions = config.requestOptions;

var crawlQueue = require('./crawlQueue.js');
var domCrawlQueue = crawlQueue(working_root_path, crawl);
domCrawlQueue.loadQueue();


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
  return path.join(working_root_path, config.crawlOptions['host'], baseName);
};

/**
 * Start the crawling the URIs in queue array.
 */
function crawl(uriObj) {
  //console.log(uriObj);
  //return;
  var uri = uriObj['uri'];

  //processingStack[uri] = uriObj;
  console.log("Crawl   :", uri);

  var filePath = getFilePath(uriObj);
  //console.log('File', filePath);

  utilBox.preparePath(path.dirname(filePath));

  if (uriObj.type !== "link") {
    //console.log('Pipe download:', uri);
    request.get({uri:uri, jar:requestOptions.jar}, pipeCallback).pipe(fs.createWriteStream(filePath));

    function pipeCallback(err) {
      console.log('Crawled', err ? 'ERROR :' : ':', uri);
      //delete processingStack[uri];
      if (err) {
        uriObj.failedCount = config.crawlOptions.maxRetryCount;
        domCrawlQueue.fail(uriObj);
      } else {
        //console.log("Pipe save:", filePath);
        domCrawlQueue.finish(uriObj);
      }
      //process.nextTick(crawl);
    }
  } else {
    request.get({uri:uri, encoding:null, jar:requestOptions.jar}, iconvCallback);
    function iconvCallback(err, response, body) {
      if (err) {
        tailFunction(err);
      } else {
        console.assert(Buffer.isBuffer(body));
        //console.log('type of body is buffer', Buffer.isBuffer(body));
        if (/(gbk)$/i.test(response.headers['content-type'])) {
          try {
            body = new Iconv('GBK', "UTF-8").convert(body).toString()
                .replace("text\/html; charset=gbk", "text\/html; charset=utf-8");
          } catch (e) {
            tailFunction(e);
          }
        }
        fs.writeFile(filePath, body
          //TODO(Inaction) replace absolute path to relative path.
            .replace(/www\.nocancer\.com\.cn/g, 'nocancer.inaction.me')
          //TODO(Inaction) add this to plugin's before save functions;
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
            require('jsdom').env({html:body, src:[jQuerySrc],
                                   done:function (err, window) {
                                     if (err) {
                                       tailFunction(err);
                                       return;
                                     }
                                     //console.log('Parse HTML :', uri);
                                     requestOptions.callback(window, window.$, tailFunction, requestOptions['updateFlag']);
                                   }});

          }
        });
      }
      //错误的防盗错误队列进行处理
      function tailFunction(err) {
        console.error('Crawled', err ? 'ERROR :' : ':', uri);
        if (err) {
          uriObj.failedCount += 1;
          domCrawlQueue.fail(uriObj);
        } else if (response.statusCode > config.maxMemoryUsage) {
          uriObj.failedCount = config.crawlOptions.maxRetryCount;
          domCrawlQueue.fail(uriObj);
        } else {
          domCrawlQueue.finish(uriObj);
        }
      }

    }
  }
}


var crawler = function crawler() {
  var that = {};

  //TODO(Inaction) add crawl mode;update mode;last update mode.

  that.push = function (url) {
    var uri = {type:'link'};
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

    if (!utilBox.isURL(link)) {return false;} //is not url exit

    //51.la exit TODO(Inaction) remove hadcode here: use url.parse(url).port/hostname
    //var isExcludedLink = /(51\.la)|(bbs\.jhnews\.com\.cn)|(nocancer\.com\.cn:8080\/)/.test(link);
    //if (isExcludedLink) {return false;}


    //if (link in processingStack) {return false;}

    //attachment exists exit
    if (uri.type === 'attachment' && attchments.exists(link)) {
      //console.log('Skip attachment', link);
      return false;
    } else {
      //console.log('attachment not exists,continue download.');
    }


    domCrawlQueue.push(uri);
    return true;
  };


  /**
   * Init crawler options for request.
   * @param options
   */
  that.init = function (options) {
    utilBox.copyProperites(requestOptions,options);
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

    that.push({uri:baseURI, type:'link', failedCount:0 });
    domCrawlQueue.dumpQueue();
  };


  return that;
}();

module.exports = crawler;

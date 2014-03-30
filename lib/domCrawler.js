/**
 * FileName: domCrawler.js copy from SmartCrawler.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 23:51
 * Description:
 *     The crawler use jsdom
 */
var request = require('request');
var fs = require('fs');
var URL = require('url');
var path = require('path');
//var Iconv = require('iconv').Iconv;
var iconvLite = require('iconv-lite');
var utilBox = require('./utilbox.js');
//TODO(Inaction) use attachement as discuz plugin.
var attachment = require('./../plugins/discuz/attachment.js');
var console = require('./logger').getLogger('debug');
console.log = console.info;

//Load jQuery source code to string.
var jQuerySrc = fs.readFileSync(path.join(__dirname, '../node_modules/jquery/dist/jquery.min.js')).toString();

var ROOT_PATH = config.crawlOptions.working_root_path;
utilBox.preparePath(ROOT_PATH);
var requestOptions = config.requestOptions;

var crawlQueue = require('./crawlQueue.js');
var domCrawlQueue = crawlQueue(ROOT_PATH, crawl);
domCrawlQueue.loadQueue();

var getFilePath = function (uriObj) {
  var baseName, uri = uriObj.uri;
  if (uriObj.type === "attachment") {
    return attachment.getAttFilePath(uri);
  }

  if (/(css)|(js)/.test(uriObj.type)) {
    baseName = URL.parse(uri).pathname;
  } else {
    baseName = URL.parse(uri).path;
  }
  if (/\/$/.test(baseName)) {
    baseName = path.join(baseName, 'index.html');
  }
  return path.join(ROOT_PATH, config.crawlOptions['host'], baseName);
};

/**
 * Start the crawling the URIs in queue array.
 */
function crawl(uriObj) {
  console.log(uriObj);
  var uri = uriObj['uri'];
  console.log("Crawl   :", uri);

  var filePath = getFilePath(uriObj);
  console.log('File', filePath);

  utilBox.preparePath(path.dirname(filePath));

  var tailFunction = function (err, uriObj, statusCode) {
    console.info('Crawled', uri);
    if (err) {
      console.error('Crawled err:', err);
      uriObj.failedCount += 1;
      domCrawlQueue.fail(uriObj);
    } else if (statusCode && statusCode > 400) {
      uriObj.failedCount = config.crawlOptions.maxRetryCount;
      domCrawlQueue.fail(uriObj);
    } else {
      domCrawlQueue.finish(uriObj);
    }
  };

  if (uriObj.type !== "link") {
    console.log('Pipe download:', uri);
    request.get({uri: uri, jar: requestOptions.jar},
        function (err, response) {
          tailFunction(err, uriObj, response && response.statusCode || 500);
        }).pipe(fs.createWriteStream(filePath));

  } else {
    request.get({uri: uri, encoding: null, jar: requestOptions.jar}, iconvCallback);
    function iconvCallback(err, response, body) {
      if (err) {
        tailFunction(err, uriObj);
      } else {
        if (!Buffer.isBuffer(body)) console.error("body is not a buffer.");

        console.debug('type of body is buffer', Buffer.isBuffer(body));
        if (config.crawlOptions.inputEncoding !== 'utf8') { // /(gbk)$/i.test(response.headers['content-type'])) {
          try {
            //body = new Iconv(config.crawlOptions.inputEncoding, "UTF-8").convert(body).toString()
            //这个可以正常转换但是有的字符不能通过，编码的数量少，不全；
            if (['gbk', 'gb2312'].indexOf(config.crawlOptions.inputEncoding.toLowerCase())) {
              body = iconvLite.fromEncoding(body, config.crawlOptions.inputEncoding);
            } else {
              tailFunction(err, uriObj);
            }
          } catch (e) {
            console.error('iconv error:', e);
          } finally {
            if (Buffer.isBuffer(body)) {
              tailFunction(new Error("Unsupported encoding:" + config.crawlOptions.inputEncoding), uriObj);
            } else {
              body = body.replace(new RegExp("text\/html;.*charset=" + config.crawlOptions.inputEncoding, 'i'), "text\/html; charset=utf-8");
            }
          }
        } else {
          body = body.toString('utf8');
        }
        fs.writeFile(filePath, body
          //TODO(Inaction) replace absolute path to relative path.
            .replace(/www\.nocancer\.com\.cn/g, 'nocancer.inaction.me')
          //TODO(Inaction) add this to plugin's before save functions;
            .replace('3836526', '6089389').replace(/undefined$/, ''), 'utf8', function (err) {
          if (err) {
            tailFunction(err, uriObj);
            return;
          }
          if (requestOptions.callback && /(html|xml)/.test(response.headers['content-type'])) {
            console.log("Build DOM :", uri);

            //remove all scripts
            body = body.replace(/<script.*?>.*?<\/script>/ig, '');

            require('jsdom').env(
                {html: body, src: [jQuerySrc],
                  done: function (err, window) {
                    body = null; //release memory

                    if (err) {
                      window && window.close && window.close();
                      tailFunction(err, uriObj);
                      return;
                    }
                    console.log('Parse HTML :', uri);
                    requestOptions.callback(window, window.$, function () {
                      window.close();//Call window.close(); for memory leak.
                      tailFunction(null, uriObj);
                    }, requestOptions['updateFlag']);
                  }
                }
            );
          }
        });
      }
    }
  }
}


var crawler = function crawler() {
  var that = {};

  //TODO(Inaction) add crawl all mode;update all mode;last update mode.

  that.push = function (url) {
    console.info('Push url:', url);
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
      uri.uri = link = 'http://' + config.crawlOptions.host + '/' + link;
      console.log("link:", link);
    }

    if (!utilBox.isURL(link)) {
      console.log('Not valid url:', link);
      return false;
    } //is not url exit

    //if (link in processingStack) {return false;}

    //attachment exists exit
    if (uri.type === 'attachment' && attachment.exists(link)) {
      console.log('Skip attachment', link);
      return false;
    } else {
      console.log('attachment not exists,continue download.');
    }


    domCrawlQueue.push(uri);
    return true;
  };


  /**
   * Init crawler options for request.
   * @param options
   */
  that.init = function (options) {
    utilBox.copyProperites(requestOptions, options);
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

    that.push({uri: baseURI, type: 'link', failedCount: 0 });
    domCrawlQueue.dumpQueue();

  };


  return that;
}();

module.exports = crawler;

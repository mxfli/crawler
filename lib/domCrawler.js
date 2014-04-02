"use strict";
/**
 * FileName: domCrawler.js copy from SmartCrawler.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 23:51
 * Description:
 *     The crawler use jsdom and jQuery
 */
var assert = require('assert');
var fs = require('fs');
var url = require('url');
var path = require('path');
var request = require('request');
var iconv = require('iconv-lite');
var charset = require('charset');
var console = require('./logger').getLogger('debug');
console.log = console.info;

var utilBox = require('./utilbox.js');

//Load jQuery source code to string.
var jQuerySrc = fs.readFileSync(path.join(__dirname, '../node_modules/jquery/dist/jquery.min.js')).toString();

//prepare working path
var ROOT_PATH = config.crawlOptions.working_root_path;
utilBox.preparePath(ROOT_PATH);

var requestOptions = config.requestOptions;

//Get file path of url
var getFilePath = function (uriObj) {
  return config.crawlOptions.resourceParser.getFileName(ROOT_PATH,uriObj);
};

var getAbsUrlPath = function (baseURI, path) {
  var urlObj = url.parse(path);
  var result = urlObj.host ? path : url.resolve(baseURI, path);
  if (!urlObj.host) {
    console.debug('Reserve path:', path);
    console.debug('Resolved result:', result);
  }
  return result;
};

var getBaseURI = function (window) {
//get baseURI, document.baseURI is not working in jsdom.
  var $base = window.$('base');
  var urlObj = url.parse(window.location.href);
  var basePath = $base.length === 1 ? $base.attr('href') : path.dirname(urlObj.pathname);
  if (!url.parse(basePath).host) {
    basePath = url.resolve(window.location.href, basePath);
  }
  return basePath;
};
/**
 * Start the crawling the URIs in queue array.
 */
var crawl = function (uriObj) {
  //console.log(uriObj);
  var uri = uriObj['uri'];
  console.log("Crawl   :", uriObj.type, uri);

  var filePath = getFilePath(uriObj);
  console.debug('File', filePath);

  utilBox.preparePath(path.dirname(filePath));

  /**
   * Call on crawl end.
   * @param err
   * @param uriObj
   * @param statusCode Crawled response statusCode.
   */
  var crawlEnd = function (err, uriObj, statusCode) {
    if (err) {
      console.error('Crawled err:', err);
      uriObj.failedCount += 1;
      domCrawlQueue.fail(uriObj);
    } else if (statusCode && statusCode > 400) {
      console.error('Crawl failed, statusCode:', statusCode);
      uriObj.failedCount = config.crawlOptions.maxRetryCount;
      domCrawlQueue.fail(uriObj);
    } else {
      console.info('Crawled :', uri);
      domCrawlQueue.finish(uriObj);
    }
  };

  if (uriObj.type !== "link") {
    request.get({uri: uri, jar: requestOptions.jar}, function (err, response) {
      crawlEnd(err, uriObj, !err && response.statusCode || 500);
      if (!err && response.statusCode === 200) {
        //response.pipe(fs.createWriteStream(filePath));
        console.log('Save pipe to:', filePath);
      }
    }).pipe(fs.createWriteStream(filePath));
  } else {
    request.get({uri: uri, encoding: null, jar: requestOptions.jar}, function (err, res, body) {
      if (err || res.statusCode !== 200) {
        return crawlEnd(err, uriObj, res && res.statusCode || 999);
      }

      if (!Buffer.isBuffer(body)) {
        throw new Error("body is not a buffer.");
      }

      console.debug('Input charset:', charset(res.headers));

      var inputCharset = charset(res.headers, body) || config.crawlOptions.inputEncoding || 'utf8';

      //1. Basic convert to unix/utf8
      if (!/utf\-8/i.test(inputCharset)) { // /(gbk)$/i.test(response.headers['content-type'])) {
        try {
          //这个可以正常转换但是有的字符不能通过，编码的数量少，不全；
          body = iconv.decode(body, 'gbk');
          body = body
              .replace(new RegExp("text\/html;.*charset=" + inputCharset, 'i'), "text\/html; charset=utf-8")
              .replace(/\r\n/g, '\n');
        } catch (e) {
          console.error('iconv error:', e);
          crawlEnd(err, uriObj);
        }
      } else {
        console.warn('Response body is utf8');
        body = body.toString('utf8');
      }

      //2. Remove absolute path to relative path
      var hostname = config.crawlOptions.host.replace(/\./g, '\.');
      var regexp = new RegExp('http:\/\/' + hostname, 'g');
      var outputCrawled = body.replace(regexp, '');
      //3. save to disk
      fs.writeFile(filePath, outputCrawled, function (err) {
        if (err) {
          return crawlEnd(err, uriObj);
        }
        console.info('Save to:', filePath);
      });

      //4. Remove all script for parsing HTML DOM.
      body = body.replace(/<script.*?>.*?<\/script>/ig, '');
      //5. parse links
      require('jsdom').env({ html: body, src: [jQuerySrc],
        done: function (err, window) {
          body = null; //release memory

          if (err) {
            window && window.close && window.close();
            return crawlEnd(err, uriObj);
          }

          console.debug('Parse HTML :', uri);
          var baseURI = getBaseURI(window);
          var host = url.parse(baseURI).host;

          var linkStacks = [];
          var hander = {
            callback: function () {
              window.close();//Call window.close(); for memory leak.
              console.info('Resource count in page:', uriObj.uri, linkStacks);
              crawlEnd(null, uriObj);
            },
            parse: function (jQuerySelector, resourceType, callback) {
              var resources = window.$(jQuerySelector);
              if (resources) {
                linkStacks.push(resourceType + ': ' + resources.length);
                resources.each(function (index, link) {
                  callback(link);
                });
              } else {
                linkStacks.push(resourceType, 0);
              }
            },
            push: function (uriObj) {
              var host2 = url.parse(uriObj.uri).host;
              if (!host2) {
                uriObj.uri = getAbsUrlPath(baseURI, uriObj.uri);
                crawler.push(uriObj);
              }
              else if (host2 === host) {
                if (uriObj.type === 'attachment' && fs.existsSync(getFilePath(uriObj.uri))) {
                  return;
                }
                crawler.push(uriObj);
              }
            }};

          config.crawlOptions.resourceParser.parseLinks(window, window.$, hander);
        }
      });
    });
  }
};


var crawlQueue = require('./crawlQueue.js');
var domCrawlQueue = crawlQueue(ROOT_PATH, crawl);
domCrawlQueue.loadQueue();

var crawler = function crawler() {
  var that = {};//Object.create(null);

  that.push = function (uriObj) {
    assert.ok(uriObj);
    uriObj.failedCount = uriObj.failedCount || 0;
    var link = uriObj.uri;
    assert.ok(link);
    assert.ok('link css img css js attachment'.split(' ').indexOf(uriObj.type) !== -1);
    assert.ok(uriObj.failedCount >= 0);

    if (utilBox.isURL(link)) {
      console.debug('Add uri:', link, 'to queue.');
      domCrawlQueue.push(uriObj);
    } else {
      console.warn('Not valid url:', link);
    }
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
    var uri = url.parse(baseURI);
    config.crawlOptions['host'] = uri.hostname;
    console.log('Add domain for base uri:', config.crawlOptions['host']);

    that.push({uri: baseURI, type: 'link', failedCount: 0 });
    domCrawlQueue.dumpQueue();
  };

  return that;
}();

module.exports = crawler;

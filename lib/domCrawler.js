"use strict";
/**
 * FileName: domCrawler.js copy from SmartCrawler.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 23:51
 * Description:
 *     The crawler use jsdom
 */
var assert = require('assert');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var request = require('request');
var iconv = require('iconv-lite');
var charset = require('charset');
var console = require('./logger').getLogger('info');
console.log = console.info;

var utilBox = require('./utilbox.js');
//TODO(Inaction) use attachement as discuz plugin.
var attachment = require('./plugins/discuz/attachment.js');

//Load jQuery source code to string.
var jQuerySrc = fs.readFileSync(path.join(__dirname, '../node_modules/jquery/dist/jquery.min.js')).toString();

//prepare working path
var ROOT_PATH = config.crawlOptions.working_root_path;
utilBox.preparePath(ROOT_PATH);

var requestOptions = config.requestOptions;

//Get file path of url
var getFilePath = function (uriObj) {
  var baseName = config.crawlOptions.resourceParser.getBaseName(uriObj);
  return path.join(ROOT_PATH, config.crawlOptions['host'], baseName);
};

/**
 * Start the crawling the URIs in queue array.
 */
var crawl = function (uriObj) {
  //console.log(uriObj);
  var uri = uriObj['uri'];
  console.log("Crawl   :", uriObj.type, uri);

  var filePath = getFilePath(uriObj);
  console.log('File', filePath);

  utilBox.preparePath(path.dirname(filePath));

  /**
   * Call on crawl end.
   * @param err
   * @param uriObj
   * @param statusCode Crawled response statusCode.
   */
  var crawlEnd = function (err, uriObj, statusCode) {
    console.info('Crawled', uri);
    if (err) {
      console.error('Crawled err:', err);
      uriObj.failedCount += 1;
      domCrawlQueue.fail(uriObj);
    } else if (statusCode && statusCode > 400) {
      console.error('Crawl failed, statusCode:', statusCode);
      uriObj.failedCount = config.crawlOptions.maxRetryCount;
      domCrawlQueue.fail(uriObj);
    } else {
      domCrawlQueue.finish(uriObj);
    }
  };

  if (uriObj.type !== "link") {
    request.get({uri: uri, jar: requestOptions.jar}, function (err, response) {
      crawlEnd(err, uriObj, !err && response.statusCode || 500);
      if (!err && response.statusCode === 200) {
        //response.pipe(fs.createWriteStream(filePath));
        console.log('Pipe download:', uri);
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
      console.debug('response.headers', res.headers);
      console.debug('Input charset:', charset(res.headers));
      var inputCharset = charset(res.headers, body) || config.crawlOptions.inputEncoding || 'utf-8';

      //1. basic convert to unix/utf8
      if (!/utf\-8/i.test(inputCharset)) { // /(gbk)$/i.test(response.headers['content-type'])) {
        try {
          //这个可以正常转换但是有的字符不能通过，编码的数量少，不全；
          body = iconv.decode(body, 'gbk');
          body = body
              .replace(
              new RegExp("text\/html;.*charset=" + config.crawlOptions.inputEncoding, 'i'),
              "text\/html; charset=utf-8")
              .replace(/\r\n/g, '\n');
        } catch (e) {
          console.error('iconv error:', e);
          crawlEnd(err, uriObj);
        }
      } else {
        console.warn('Response body is utf8');
        body = body.toString('utf8');
      }

      //2. remove absolute path to relative path
      var hostname = config.crawlOptions.host.replace(/\./g, '\.');
      var regexp = new RegExp('http:\/\/' + hostname, 'g');
      var outputCrawled = body.replace(regexp, '');
      //3. save to disk
      fs.writeFile(filePath, outputCrawled, function (err) {
        if (err) {
          return crawlEnd(err, uriObj);
        }

        body = body.replace(/<script.*?>.*?<\/script>/ig, '');
        //4. parse links
        require('jsdom').env({
          html: body,
          src: [jQuerySrc],
          done: function (err, window) {
            body = null; //release memory

            if (err) {
              window && window.close && window.close();
              crawlEnd(err, uriObj);
              return;
            }

            console.log('Parse HTML :', uri);
            config.crawlOptions.resourceParser.parseLinks(window, window.$, function () {
              window.close();//Call window.close(); for memory leak.
              crawlEnd(null, uriObj);
            }, requestOptions['updateFlag']);
          }
        });
      });
    });
  }
};


var crawlQueue = require('./crawlQueue.js');
var domCrawlQueue = crawlQueue(ROOT_PATH, crawl);
domCrawlQueue.loadQueue();

var crawler = function crawler() {
  var that = {};//Object.create(null);

  //TODO(Inaction) add crawl all method;update all method;last update method.

  that.push = function (uri) {
    uri.failedCount = uri.failedCount || 0;
    assert.ok(uri.uri);
    assert.ok('link css img css js attachment'.split(' ').indexOf(uri.type) !== -1);
    assert.ok(uri.failedCount >= 0);


    var link = uri.uri;
    if (uri.type !== 'link' && link.indexOf('http') < 0) {
      uri.uri = link = 'http://' + config.crawlOptions.host + '/' + link;
      console.log("link:", link);
    }

    if (!utilBox.isURL(link)) {
      console.log('Not valid url:', link);
      return false;
    } //is not url exit

    //attachment exists exit
    if (uri.type === 'attachment' && attachment.exists(link)) {
      console.log('Skip attachment', link);
      return false;
    }

    console.info('Add uri:', uri.uri, 'to queue.');
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

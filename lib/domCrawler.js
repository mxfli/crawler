"use strict";
/**
 * FileName: domCrawler.js copy from SmartCrawler.js
 * Author: @mxfli
 * CreateTime: 2011-12-09 23:51
 * Description:
 *     The crawler cheerio which likes jsdom+jquery and less memory leak.
 */
var assert = require('assert');
var fs = require('fs');
var url = require('url');
var path = require('path');
var needle = require('needle');
var cheerio = require('cheerio');
var charset = require('charset');
var console = require('./logger').getLogger('info');
console.log = console.info;

var utilBox = require('./utilbox.js');


var crawlOptions = global.config.crawlOptions;
var requestOptions = global.config.requestOptions;
var resourceParser = crawlOptions.resourceParser;
//prepare working path
var ROOT_PATH = crawlOptions.working_root_path;
utilBox.preparePath(ROOT_PATH);


//Get file path of url
var getFilename = function (uriObj) {
  return resourceParser.getFileName(uriObj);
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

var getBaseURI = function ($base, locationHref) {
//get baseURI, document.baseURI is not working in jsdom.
  var urlObj = url.parse(locationHref);
  var basePath = $base.length === 1 ? $base.attr('href') : path.dirname(urlObj.pathname);
  if (!url.parse(basePath).host) {
    basePath = url.resolve(locationHref, basePath);
  }
  return basePath;
};

/**
 * Start the crawling the URIs in queue array.
 */
var crawl = function (uriObj) {
  //console.log(uriObj);
  var uri = uriObj.uri;
  console.log("Crawl :", uriObj.type, uri);

  console.debug('File', uriObj.filename);
  Object.defineProperty(uriObj, 'distFilename', {
    value: path.join(ROOT_PATH, url.parse(uriObj.uri).hostname, uriObj.filename),
    writable: true,
    numerable: false,
    configurable: true});

  utilBox.preparePath(path.dirname(uriObj.distFilename));

  /**
   * Call on crawl end.
   * @param err
   * @param uriObj
   * @param statusCode Crawled response statusCode.
   */
  var crawlEnd = function (err, uriObj, statusCode) {
    if (err) {
      console.error('Crawled err:', err);
      return domCrawlQueue.fail(uriObj);
    } else if (statusCode && statusCode > 400) {
      console.error('Crawl failed, statusCode:', statusCode);
      uriObj.failedCount = crawlOptions.maxRetryCount;
      return domCrawlQueue.fail(uriObj);
    } else {
      console.info('Crawled :', uri);
      return domCrawlQueue.finish(uriObj);
    }
  };

  if (uriObj.type !== "link") {
    needle.get(uri, {compressed: true, follow: true, headers: requestOptions}, function(err, res, body){
      if(!err && res.statusCode === 200){
        console.log('Save pipe to:', uriObj.filename);
      }
      crawlEnd(err, uriObj, !err && res.statusCode || 500);
    }).pipe(fs.createWriteStream(uriObj.distFilename));
  } else {
    var needleOptions = { compressed: true, follow: true, headers: requestOptions};

    needle.get(uri, needleOptions, function (err, res, body) {
      if (err || res.statusCode !== 200) {
        return crawlEnd(err, uriObj, res && res.statusCode || 999);
      }

      //console.debug('Response body:', body);
      //assert(Buffer.isBuffer(body), 'body is not a buffer.');

      console.info('Input charset:', charset(res.headers));

      var inputCharset = charset(res.headers, body) || crawlOptions.inputEncoding || 'utf8';

      //1. Basic convert to unix/utf8
      //1.1 deedle decode gbk to utf8, but not change meta charset of contant.
      if (/(utf\-8)|(utf8)/i.test(inputCharset)) {
        body = body.replace(new RegExp("text\/html;.*charset=" + inputCharset, 'i'), "text\/html; charset=utf-8")
            .replace(/\r\n/g, '\n');
      } else {
        console.debug('Response body is utf8');
      }

      //2. Remove absolute path to relative path
      //3. save to disk
      var saveCrawledUri = function (output) {
        var regexp = new RegExp('http:\/\/' + crawlOptions.host.replace(/\./g, '\.'), 'g');
        var outputCrawled = output || body;
        outputCrawled = outputCrawled.replace(regexp, '');

        //console.warn(outputCrawled);

        fs.writeFile(uriObj.distFilename, outputCrawled, function (err) {
          if (err) {
            return crawlEnd(err, uriObj);
          }
          outputCrawled = null;
          console.info('Save to:', uriObj.filename);
        });
      };
      if (!resourceParser.modify) {
        saveCrawledUri();
      }

      //4. Remove all script for parsing HTML DOM.
      body = body.replace(/<script.*?>.*?<\/script>/ig, '');
      //5. parse links
      var $ =  cheerio.load(body, { normalizeWhitespace: true, xmlMode: false });

      console.debug('Parse HTML :', uri);
      var baseURI = getBaseURI($('base'), uriObj.uri);

      //todo move linkStacks into resourcePraser.
      var linkStacks = [];
      var handler = {
        parse: function (jQuerySelector, resourceType, callback) {
          var resources = jQuerySelector;
          if (resources) {
            //todo use Object[key] to count;
            linkStacks.push(resourceType + ': ' + resources.length);
            resources.each(function (index, link) {
              callback($(link));
            });
          } else {
            linkStacks.push(resourceType, 0);
          }
        },
        push: function (uriObj) {
          var host2 = url.parse(uriObj.uri).host;
          if (!host2) {
            uriObj.uri = getAbsUrlPath(baseURI, uriObj.uri);
          }
          uriObj.filename = getFilename(uriObj);
          crawler.push(uriObj);
        }};


      resourceParser.parseLinks($, handler);
      if (resourceParser.modify) {
        saveCrawledUri(resourceParser.modify($, handler));
      } else {
        //TODO change rules then move parseLines method downside.
        //resourceParser.parseLinks($, handler);
      }

      console.info('Resource count in page:', uriObj.uri, linkStacks);
      linkStacks = null;
      crawlEnd(null, uriObj);
    });
  }
};


var crawlQueue = require('./crawlQueue.js');
var domCrawlQueue = crawlQueue(ROOT_PATH, crawl);
domCrawlQueue.loadQueue();

var crawler = function crawler() {
  var that = {};//Object.create(null);

  that.push = function (uriObj) {
    var link = uriObj.uri;

    if (utilBox.isURL(link)) {
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
    //utilBox.copyProperites(requestOptions, options);
    return that;
  };

  /**
   * Add base uri to crawl
   * @param baseURI  uri to crawl
   */
  that.crawl = function (baseURI) {
    var uri = url.parse(baseURI);
    crawlOptions.host = uri.hostname;
    console.log('Add domain for base uri:', crawlOptions.host);

    var uriObj = {uri: baseURI, type: 'link', failedCount: 0 };
    uriObj.filename = getFilename(uriObj);
    that.push(uriObj);
    domCrawlQueue.dumpQueue();
  };

  return that;
}();

module.exports = crawler;

"use strict";
/**
 * Main crawler.
 * Author: @mxfli
 * CreateTime: 2011-12-09 23:51
 * Description:
 *     The crawler cheerio which likes jsdom+jquery and less memory leak.
 */
var fs = require('fs');
var url = require('url');
var path = require('path');
var needle = require('needle');
var cheerio = require('cheerio');
var console = require('./logger').getLogger('info');
console.log = console.info;

var utilBox = require('./utilbox.js');

var crawlOptions = global.config.crawlOptions;
var requestOptions = global.config.requestOptions;
var resourceParser = crawlOptions.resourceParser;
//prepare working path
var ROOT_PATH = crawlOptions.working_root_path;
utilBox.preparePathSync(ROOT_PATH);


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
  console.info('uriObj.uri:', uriObj.uri, 'uriObj.filename:', uriObj.filename);
  //Fix some url error, mark url as error then continu the next.
  try {

    var hostname2 = url.parse(uriObj.uri).hostname;
    if (hostname2 !== crawlOptions.host) {
      hostname2 = 'externres';
    }

    Object.defineProperty(uriObj, 'distFilename', {
      value: path.join(ROOT_PATH, hostname2, uriObj.filename),
      writable: true,
      numerable: false,
      configurable: true});
  } catch (e) {
    uriObj.status = 3;
    return;
  }

  utilBox.preparePathSync(path.dirname(uriObj.distFilename));

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

  /**
   * pipe crawl and save resource to disk.
   * @param uriObj
   */
  var pipeCrawl = function (uriObj) {
    needle.get(uriObj.uri, {headers: requestOptions}, function (err, res) {
      if (!err && res.statusCode === 200) {
        console.log('Save pipe to:', uriObj.filename);
      }
      crawlEnd(err, uriObj, !err && res.statusCode || 500);
    }).pipe(fs.createWriteStream(uriObj.distFilename));
  };

  //link and css not use pipe download.
  if (uriObj.type !== "link" && uriObj.type !== 'css') {
    pipeCrawl(uriObj);
  } else if (uriObj.type === 'css') {
    needle.get(uri, { compressed: true, follow: true, headers: requestOptions}, function (err, res, body) {

      //get all css url() resources in css file.
      var images = body.match(/url\(.+?\)/ig) || [];

      images.forEach(function (cssURI) {
        var imgPath = cssURI.replace('url(', '').replace(')', '');
        if (!/^(http)|(\/\/)/i.test(imgPath)) {
          if (/^\//.test(imgPath)) {
            imgPath = 'http://' + crawlOptions.host + imgPath;
          } else {
            imgPath = path.join(path.dirname(uriObj.uri), imgPath);
          }
        }
        console.debug('css Image ::', imgPath);
        crawler.crawl(imgPath, 'img');
      });

      //Modify CSS
      if (resourceParser.cssModify) {
        body = resourceParser.cssModify(body);
      }

      //Save css File.
      fs.writeFile(uriObj.distFilename, body, function (err) {
        crawlEnd(err, uriObj, res.statusCode || 500);
      });
    });
  } else {
    var needleOptions = { compressed: true, follow: true, headers: requestOptions};

    needle.get(uri, needleOptions, function (err, res, body) {
      if (err || res.statusCode !== 200) {
        return crawlEnd(err, uriObj, res && res.statusCode || 999);
      }

      //Change dos to unix
      body = body.replace(/\r\n/g, '\n');

      //Save to disk
      var saveCrawledUri = function (output) {
        //TODO Move change absolute url to relative path to $ modify.
        var regexp = new RegExp('http:\/\/' + crawlOptions.host.replace(/\./g, '\.'), 'g');
        var outputCrawled = output || body;
        outputCrawled = outputCrawled.replace(regexp, '');

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

      //Remove all script for parsing HTML DOM.
      //body = body.replace(/<script.*?>.*?<\/script>/ig, '');

      //Parse links
      var $ = cheerio.load(body, { normalizeWhitespace: true, xmlMode: false, decodeEntities: true});

      console.debug('Parse HTML :', uri);
      //Get BASE URI of the document.
      var baseURI = getBaseURI($('base'), uriObj.uri);

      //Push found links of this document.
      var push = function (uriObj) {
        var hostname = url.parse(uriObj.uri).hostname;
        //Add hostname to the link
        if (!hostname) {
          uriObj.uri = getAbsUrlPath(baseURI, uriObj.uri);
          hostname = url.parse(uriObj.uri).hostname;
        }

        //Do not crawl extern page links.
        if (uriObj.type === 'link' && hostname !== crawlOptions.host) {
          console.log('Skip link :', uriObj.uri);
          return;
        }

        //Crawl all resources to local.
        uriObj.filename = getFilename(uriObj);
        crawler.push(uriObj);
      };

      resourceParser.parseLinks($, push);
      if (resourceParser.modify) {
        saveCrawledUri(resourceParser.modify($, push));
      } else {
        //TODO change rules then move parseLines method downside.
        //resourceParser.parseLinks($, handler);
      }

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
  that.crawl = function (baseURI, type) {
    var uri = url.parse(baseURI);
    type = type || 'link';
    if (!crawlOptions.host) {
      crawlOptions.host = uri.hostname;
      console.log('Add domain for base uri:', crawlOptions.host);
    }

    var uriObj = {uri: baseURI, type: type, failedCount: 0 };
    uriObj.filename = getFilename(uriObj);
    that.push(uriObj);
    domCrawlQueue.dumpQueue();
  };

  that.update = domCrawlQueue.update;

  return that;
}();

module.exports = crawler;

"use strict";

//TODO remove crawler use abstract crawler only or use resourceParser to add new links.
var console = require('../../logger').getLogger('info');
console.log = console.info;
var crawler = require('../../domCrawler.js');
var url = require('url');
var path = require('path');
var attachement = require('./attachment.js');

var getAbsUrlPath = function (baseURI, path) {
  var urlObj = url.parse(path);
  var result = urlObj.host ? path : url.resolve(baseURI, path);
  if (!urlObj.host) {
    console.debug('Reserve path:', path);
    console.debug('Resolved result:', result);
  }
  return result;
};

/**
 * DiscuzX2 plugin.
 *
 * 具体执行扒站的分析代码，原则上只取有效的代码
 * 注：下面的代码要符合JS DOM编程规范,$是jQuery的符号，可以用jQuery
 * 堆栈的原则是后进先出，可以用来调整下载的顺序；
 */
//TODO(Inaction) Add disable enable features config to plugin manager.
exports.parseLinks = function (window, $, callback, flag) {
  //console.log("Processing resources in page ", $("title").text().replace('- Powered by Discuz!', ''));
  var linkStacks = [];

  var parse = function (jQuerySelector, selecterName, callback) {
    var resources = $(jQuerySelector);
    if (resources) {
      linkStacks.push(selecterName + ': ' + resources.length);
      resources.each(function (index, link) {
        callback(link);
      });
    } else {
      linkStacks.push(selecterName, 0);
    }
  };


  //get baseURI, document.baseURI is not working in jsdom.
  var baseURI = function () {
    var $base = $('base');
    var urlObj = url.parse(window.location.href);
    var basePath = $base.length === 1 ? $base.attr('href') : path.dirname(urlObj.pathname);
    if (!url.parse(basePath).host) {
      basePath = url.resolve(window.location.href, basePath);
    }
    return basePath;
  }();

  var host = url.parse(baseURI).host;
  var push = function (uriObj) {
    if (url.parse(uriObj.uri).host === host) {
      if (uriObj.type === 'attachement' && attachement.exists(uriObj.uri)) {
        return;
      }
      crawler.push(uriObj);
    }
  };

//pipe images
  parse('img[file^="forum.php?mod=attachment"]', "images", function (img) {
    push({uri: getAbsUrlPath(baseURI, img.getAttribute('file')), type: 'attachment'});
    push({uri: getAbsUrlPath(baseURI, img.getAttribute('zoomfile')), type: 'attachment'});
  });

  //pipe attachments and not need JB
  parse('a[href^="forum.php?mod=attachment"]', 'attachments', function (attachment) {
    var needJB = $('#' + (attachment.parentNode.id || attachment.id) + '_menu').text().indexOf('金币') > 0;
    if (!needJB) {
      //console.log('attachment:', attachment.href, $('#' + $(attachment).parent().id + '_menu').text());
      push({uri: getAbsUrlPath(baseURI, attachment.href), type: 'attachment'});
    }
  });

  parse('img', 'image', function (link) {
    push({uri: getAbsUrlPath(baseURI, link.src), type: 'img'});
  });

  parse('link[rel="stylesheet"]', 'css', function (link) {
    push({uri: getAbsUrlPath(baseURI, link.href), type: 'css'});
  });

  parse('sscript[src^="static/"]', 'js', function (link) {
    push({uri: getAbsUrlPath(baseURI, $(link).attr('src')), type: 'js'});
  });


  if (config.crawlOptions.recursive) {
    //thread links
    if (flag % 2 === 0) {
      parse('a[href$=".html"][href^="forum"]', 'forum', function (link) {
        push({uri: getAbsUrlPath(baseURI, link.href), type: 'link'});
      });
    } else {
      parse('a[href$=".html"][href^="thread"]', 'thread', function (link) {
        push({uri: getAbsUrlPath(baseURI, link.href), type: 'link'});
      });
    }


    //archive links
    parse('a[href^="archiver/"],a[href^="?tid-"]', 'Archive', function (a) {
      push({uri: getAbsUrlPath(baseURI, a.href), type: 'link'});
    });

    //forum links
    parse('a[href^="forum.php?gid="] ', 'forum', function (a) {
      push({uri: getAbsUrlPath(baseURI, a.href), type: 'link'});
    });

    parse('a[href="group.php"],a[href="portal.php"],a[href="home.php"]', 'p&f&g', function (link) {
      //console.log('group:', link.href);
      if (/\.php$/.test(link.href)) {
        //console.log('push:', link.href, crawler.push({uri:link.href, type:'link'}));
        push({uri: getAbsUrlPath(baseURI, link.href), type: 'link'});
      }
    });

    parse('a[href^="group.php?gid="]', 'group', function (link) {
      //console.log('group:', link.href);
      if (/group\.php\?gid=\(d{1,3}$/.test(link.href)) {
        push({uri: getAbsUrlPath(baseURI, link.href), type: 'link'});
      }
    });

    parse('a[href^="home.php?mod=space&uid="]', 'space', function (link) {
      if (/home\.php\?mod=space&uid=\d{1,6}$/.test(link.href)) {
        push({uri: getAbsUrlPath(baseURI, link.href), type: 'link'});
      }
    });
  }

  console.log('found :', linkStacks.join(';'));

  callback && callback();
};


//Get file path of url
exports.getBaseName = function (uriObj) {
  var baseName, uri = uriObj.uri;
  if (uriObj.type === "attachment") {
    return attachment.getAttFilePath(uri);
  }

  if (/(css)|(js)/.test(uriObj.type)) {
    baseName = url.parse(uri).pathname;
  } else {
    baseName = url.parse(uri).path;
  }
  if (/\/$/.test(baseName)) {
    baseName = path.join(baseName, 'index.html');
  }
  return baseName;
};

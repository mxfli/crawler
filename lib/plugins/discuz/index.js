"use strict";
/**
 * DiscuzX2 plugin.
 *
 * 具体执行扒站的分析代码，原则上只取有效的代码
 * 注：下面的代码要符合JS DOM编程规范,$是jQuery的符号，可以用jQuery
 * 堆栈的原则是后进先出，可以用来调整下载的顺序；
 */

var console = require('../../logger').getLogger('info');
console.log = console.info;
var url = require('url');
var path = require('path');
var attachment = require('./attachment.js');

exports.parseLinks = function ($, handler) {

//pipe images
  handler.parse('img[file^="forum.php?mod=attachment"]', "images", function (img) {
    handler.push({uri: img.getAttribute('file'), type: 'attachment'});
    handler.push({uri: img.getAttribute('zoomfile'), type: 'attachment'});
  });

  //pipe attachments and not need JB
  handler.parse('a[href^="forum.php?mod=attachment"]', 'attachments', function (attachment) {
    var needJB = $('#' + (attachment.parentNode.id || attachment.id) + '_menu').text().indexOf('金币') > 0;
    if (!needJB) {
      //console.log('attachment:', attachment.href, $('#' + $(attachment).parent().id + '_menu').text());
      handler.push({uri: (attachment.href), type: 'attachment'});
    }
  });

  handler.parse('img', 'image', function (link) {
    handler.push({uri: link.src, type: 'img'});
  });

  handler.parse('link[rel="stylesheet"]', 'css', function (link) {
    handler.push({uri: link.href, type: 'css'});
  });

  handler.parse('sscript[src^="static/"]', 'js', function (link) {
    handler.push({uri: $(link).attr('src'), type: 'js'});
  });


  //递归抓取页面内容
  if (config.crawlOptions.recursive) {
    //thread links
    handler.parse('a[href$=".html"][href^="forum"]', 'forum', function (link) {
      handler.push({uri: link.href, type: 'link'});
    });

    handler.parse('a[href$=".html"][href^="thread"]', 'thread', function (link) {
      handler.push({uri: link.href, type: 'link'});
    });

    //archive links
    handler.parse('a[href^="archiver/"],a[href^="?tid-"]', 'Archive', function (a) {
      handler.push({uri: a.href, type: 'link'});
    });

    //forum links
    handler.parse('a[href^="forum.php?gid="] ', 'forum', function (a) {
      handler.push({uri: a.href, type: 'link'});
    });

    handler.parse('a[href="group.php"],a[href="portal.php"],a[href="home.php"]', 'p&f&g', function (link) {
      //console.log('group:', link.href);
      if (/\.php$/.test(link.href)) {
        //console.log('push:', link.href, crawler.push({uri:link.href, type:'link'}));
        handler.push({uri: link.href, type: 'link'});
      }
    });

    handler.parse('a[href^="group.php?gid="]', 'group', function (link) {
      //console.log('group:', link.href);
      if (/group\.php\?gid=\(d{1,3}$/.test(link.href)) {
        handler.push({uri: link.href, type: 'link'});
      }
    });

    handler.parse('a[href^="home.php?mod=space&uid="]', 'space', function (link) {
      if (/home\.php\?mod=space&uid=\d{1,6}$/.test(link.href)) {
        handler.push({uri: link.href, type: 'link'});
      }
    });
  }

  handler.callback && handler.callback();
};


//Get file path of url
exports.getFileName = function (baseDir, uriObj) {
  var filename, uri = uriObj.uri;
  if (uriObj.type === "attachment") {
    return attachment.getAttFilePath(baseDir, uri);
  }

  var urlObj = url.parse(uri);
  if (/(css)|(js)/.test(uriObj.type)) {
    filename = urlObj.pathname;
  } else {
    filename = urlObj.path;
  }
  if (/\/$/.test(filename)) {
    filename = 'index.html';
  }
  return path.join(baseDir, urlObj.hostname, filename);
};

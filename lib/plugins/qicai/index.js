/**
 * QicaiThread crawl rules.
 * Created by mxfli on 4/2/14.
 */
var url = require('url');
var path = require('path');
var attachment = require('../discuz/attachment');

exports.parseLinks = function ($, handler) {
  "use strict";

  //pipe images
  handler.parse('img[file*="forum.php?mod=attachment"]', "images", function (img) {
    handler.push({uri: img.getAttribute('file'), type: 'attachment'});
    handler.push({uri: img.getAttribute('src'), type: 'attachment'});
  });

  /*//pipe attachments and not need JB
  handler.parse('a[href*="forum.php?mod=attachment"]', 'attachments', function (attachment) {
    var needJB = $('#' + (attachment.parentNode.id || attachment.id) + '_menu').text().indexOf('金币') > 0;
    if (!needJB) {
      //console.log('attachment:', attachment.href, $('#' + $(attachment).parent().id + '_menu').text());
      handler.push({uri: (attachment.href), type: 'attachment'});
    }
  });*/

  /*handler.parse('img', 'image', function (link) {
    handler.push({uri: link.src, type: 'img'});
  });

  handler.parse('link[rel="stylesheet"]', 'css', function (link) {
    handler.push({uri: link.href, type: 'css'});
  });
*/
  handler.parse('a[href*="thread-50247-"]', 'link', function (link) {
    handler.push({uri: link.href, type: 'link'});
  });
};


//Get file path of url
exports.getFileName = function (baseDir, uriObj) {
  var filename, uri = uriObj.uri;
  var urlObj = url.parse(uri);

  if (uriObj.type === "attachment" && /\.php$/.test(urlObj.pathname)) {
    return attachment.getAttFilePath(baseDir, uri);
  }

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

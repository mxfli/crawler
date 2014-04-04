/**
 * QicaiThread crawl rules.
 * Created by mxfli on 4/2/14.
 */
var url = require('url');
var path = require('path');
var attachment = require('../discuz/attachment');
var fs = require('fs');

var template = fs.readFileSync(path.join(__dirname, '../../../template/index.html')).toString();

exports.parseLinks = function ($, handler) {
  "use strict";

  //pipe images
  handler.parse('img[file*="forum.php?mod=attachment"]', "images", function (img) {
    //discuz default src is a blank image, use file attribute.
    handler.push({uri: img.getAttribute('file'), type: 'attachment'});
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
  if (config.crawlOptions.recursive) {
    handler.parse('a[href*="thread-50247-"]', 'link', function (link) {
      handler.push({uri: link.href, type: 'link'});
    });
  }
};


//Get file path of url
exports.getFileName = function (uriObj) {
  var filename, uri = uriObj.uri;
  var urlObj = url.parse(uri);

  if (uriObj.type === "attachment" && /\.php$/.test(urlObj.pathname)) {
    return attachment.getAttFilePath(uri);
  }

  if (/(css)|(js)/.test(uriObj.type)) {
    filename = urlObj.pathname;
  } else {
    filename = urlObj.path;
  }
  if (/\/$/.test(filename)) {
    filename = 'index.html';
  }
  return path.join(filename);
};

exports.modify = function ($) {
  "use strict";
  var attaches = $('img[file]');
  attaches.each(function (index, attach) {
    attach.src = attach.getAttribute('file');
  });

  var ul = $('<ul id="postList"></ul>');
  var posts = $('#postlist').children('div[id^=post_]');

  console.log('get posts length:', posts.length);

  posts.each(function (index, post) {
    var $post = $(post);
    //console.dir(post);
    console.assert(post.id);

    $('<li id="' + post.id + '"></li>')
        .append('<div class="uname">' + $post.find('div.authi a.xw1').text() + '</div>')
        .append('<div class="postTime">' + $post.find('div.pi em[id^=authorposton]').text() + '</div>')
        .append('<div class="postContent">' + $post.find('div.pct div.pcb div.t_fsz').html() + '</div>')
        .appendTo(ul);
  });

  var result = template.replace(/\{\{content\}\}/ig, ul[0].outerHTML)
      .replace(/\{\{pageNav\}\}/ig, $('div.pgt').html());
  return result;
};
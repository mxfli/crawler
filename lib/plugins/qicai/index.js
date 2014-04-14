"use strict";
/**
 * QicaiThread crawl rules.
 * Created by mxfli on 4/2/14.
 */
var url = require('url');
var path = require('path');
var attachment = require('../discuz/attachment');
var fs = require('fs');
var assert = require('assert');

var template;
var lastPageCB;

exports.parseLinks = function ($, handler) {
  //pipe images
  handler.parse($('img[file*="forum.php?mod=attachment"]'), "images", function (img) {
    //discuz default src is a blank image, use file attribute.
    assert(img);
    img = $(img);
    assert(img.attr('file'));
    handler.push({uri: img.attr('file'), type: 'attachment'});
  });

  /*//pipe attachments and not need JB
   handler.parse($('a[href*="forum.php?mod=attachment"]'), 'attachments', function (attachment) {
   var needJB = $('#' + (attachment.parentNode.id || attachment.id) + '_menu').text().indexOf('金币') > 0;
   if (!needJB) {
   //console.log('attachment:', attachment.href, $('#' + $(attachment).parent().id + '_menu').text());
   handler.push({uri: (attachment.href), type: 'attachment'});
   }
   });*/

  handler.parse($('img[src$=gif]', '#postlist'), 'image', function (link) {
    link = $(link);
    var attr = link.attr('src');
    assert(attr);
    if (/\.gif$/.test(attr))
      handler.push({uri: attr, type: 'img'});
  });


  /*handler.parse('link[rel="stylesheet"]', 'css', function (link) {
   handler.push({uri: link.href, type: 'css'});
   });
   */
  if (config.crawlOptions.recursive) {
    handler.parse($('a[href*="thread-50247-"]'), 'link', function (link) {
      link = $(link);
      handler.push({uri: link.attr('href'), type: 'link'});
    });
  }
};

var attachmentFilePath = function (uriObj) {
  //path name = __dirname/hostname/attachment/tid/uid-paramnames-n
  //new Buffer(str, 'base64')).toString()
  var realIdArray = new Buffer(uriObj.query.aid, 'base64').toString().split('|');
  //console.log('realId.array: ', realIdArray);
  //console.log('16num to 10', parseInt(realIdArray[1], 16));


  var filename = realIdArray.shift() + '.jpg';
  //console.log('filename:', filename);

  return path.join('attachment', filename);
};


//Get file path of url
exports.getFileName = function (uriObj) {
  var filename, uri = uriObj.uri;
  var urlObj = url.parse(uri, true);

  if (uriObj.type === "attachment" && /\.php$/.test(urlObj.pathname)) {
    filename = path.join(path.dirname(urlObj.pathname), attachmentFilePath(urlObj));
  } else if (/(css)|(js)/.test(uriObj.type)) {
    filename = urlObj.pathname;
  } else {
    filename = urlObj.path;
  }
  if (/\/$/.test(filename)) {
    filename = path.join(filename, 'index.html');
  }
  return filename;
};

exports.modify = function ($, handler) {
  var attaches = $('img[file]');
  attaches.each(function (index, attach) {
    attach = $(attach);
    attach.attr('src', attachmentFilePath(url.parse(attach.attr('file'), true)));
  });

  var $ul = $('<ul id="postList"></ul>');
  var posts = $('#postlist').children('div[id^=post_]');

  //console.log('get posts length:', posts.length);

  posts.each(function (index, post) {
    var $post = $(post);
    //console.dir(post);
    console.assert($post.attr('id'));
    var postContent = $('<div class="postContent"></div>');
    var postMessage = $('<div class="postMessage"></div>')
        .append($post.find('div.pct div.pcb div.t_fsz td[id^=postmessage]').html());
    postContent.append(postMessage);
    var postImage = $post.find('div.pct div.pcb div.t_fsz div.pattl')
        .attr('class', 'postImage');
    postImage.find('em').remove();
    postImage.find('div.attp').remove();
    postImage.find('dl dt').remove();
    postImage.find('a').each(function (index, a) {
      a = $(a);
      a.parent().text(a.text());
    });
    //postImage.find('p.mbn').each(function(index,p){
    //});

    if (postImage.length) {
      postContent.append(postImage);
    }

    $ul.append($('<li id="' + $post.attr('id') + '"></li>')
        .append('<div class="uname"><strong>' + $post.find('div.authi a.xw1').text() + '</strong></div>')
        .append('<div class="postTime">' + $post.find('div.pi em[id^=authorposton]').text() + '</div>')
        .append(postContent));
  });

  $ul.find('*').removeAttr('onclick').removeAttr('onmouseover').removeAttr('file');
  var $pgt = $('div.pgt');
  var last = $pgt.find('a.last');
  if (lastPageCB && last.length) {
    lastPageCB(last.attr('href'), last.text());
  }

  if (!template) {
    var templateFile = config.crawlOptions.template || path.join(__dirname, '../../../template/index.html');
    template = fs.readFileSync(templateFile, {encoding: 'utf8'});
  }
  var result = template.replace(/\{\{content\}\}/ig, $ul.toString())
      .replace(/\{\{pageNum\}\}/ig, $pgt.find('strong').text())
      .replace(/\{\{pageNav\}\}/ig, $pgt.html());

  //exports.parseLinks($, handler);
  return result;
};

exports.watchPage = function (filename, cb) {
  lastPageCB = cb;
};
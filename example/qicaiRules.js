"use strict";
/**
 * QicaiThread crawl rules.
 * Created by mxfli on 4/2/14.
 */
var url = require('url');
var path = require('path');
var fs = require('fs');
var assert = require('assert');

var template;
var lastPageCB;

var handler = require('../lib/plugins/parseHelper.js');

exports.parseLinks = function ($, push) {
  //attachement images
  handler.parse($, $('img[file*="forum.php?mod=attachment"]', '#postlist'), "images", function (img) {
    //discuz default src is a blank image, use file attribute.
    assert(img);
    assert(img.attr('file'));
    push({uri: img.attr('file'), type: 'attachment'});
  });

  //gif
  handler.parse($, $('img[src$=gif]', '#postlist'), 'image', function (link) {
    var attr = link.attr('src');
    assert(attr);
    if (/\.gif$/.test(attr)) {
      push({uri: attr, type: 'img'});
    }
  });

  //threads
  if (config.crawlOptions.recursive) {
    handler.parse($, $('a[href*="thread-50247-"]'), 'link', function (link) {
      push({uri: link.attr('href'), type: 'link'});
    });
  }
};

var attachmentFilePath = function (uriObj) {
  //new Buffer(str, 'base64')).toString()
  console.log('aid:', url.format(uriObj));
  var realIdArray = new Buffer(uriObj.query.aid, 'base64').toString().split('|');
  assert(realIdArray.length > 0);
  //console.log('realId.array: ', realIdArray);

  //use image id as image name.
  var filename = realIdArray.shift() + '.jpg';

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
  var attaches = $('img[file*="forum.php?mod=attachment"]');
  attaches.each(function (index, attach) {
    attach = $(attach);
    attach.attr('src', attachmentFilePath(url.parse(attach.attr('file'), true)));
    attach.removeAttr('file');
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
  $pgt.find('label').remove();
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
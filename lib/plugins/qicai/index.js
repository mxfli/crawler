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

  handler.parse('img[src$="gif"]', 'image', function (link) {
    handler.push({uri: link.src, type: 'img'});
  });

  /*handler.parse('link[rel="stylesheet"]', 'css', function (link) {
   handler.push({uri: link.href, type: 'css'});
   });
   */
  if (config.crawlOptions.recursive) {
    handler.parse('a[href*="thread-50247-"]', 'link', function (link) {
      handler.push({uri: link.href, type: 'link'});
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
  "use strict";
  var attaches = $('img[file]');
  attaches.each(function (index, attach) {
    attach.src = attachmentFilePath(url.parse(attach.getAttribute('file'), true));
  });

  var ul = $('<ul id="postList"></ul>');
  var posts = $('#postlist').children('div[id^=post_]');

  console.log('get posts length:', posts.length);

  posts.each(function (index, post) {
    var $post = $(post);
    //console.dir(post);
    console.assert(post.id);
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
      //console.log('a text:', a.innerHTML);
      a.parentNode.innerHTML = a.innerHTML;
    });
    //postImage.find('p.mbn').each(function(index,p){
    //});

    if (postImage.length) {
      postContent.append(postImage);
    }

    $('<li id="' + post.id + '"></li>')
        .append('<div class="uname"><strong>' + $post.find('div.authi a.xw1').text() + '</strong></div>')
        .append('<div class="postTime">' + $post.find('div.pi em[id^=authorposton]').text() + '</div>')
        .append(postContent)
        .appendTo(ul);
  });

  ul.find('*').removeAttr('onclick').removeAttr('onmouseover').removeAttr('file');

  var result = template.replace(/\{\{content\}\}/ig, ul[0].outerHTML)
      .replace(/\{\{pageNav\}\}/ig, $('div.pgt').html());

  //$('body')[0].innerHTML = ul[0].outerHTML;
  //exports.parseLinks($, handler);
  return result;
};

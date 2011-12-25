var crawler = require('../SmartCrawler.js');
var jsdom = require('jsdom');

/**
 * 具体执行扒站的分析代码，原则上只取有效的代码
 * 注：下面的代码要符合JS DOM编程规范,$是jQuery的符号，可以用jQuery
 * 堆栈的原则是后进先出，可以用来调整下载的顺序；
 */
module.exports = function (window, $, callback) {
  //console.log("Processing resources in page ", $("title").text().replace('- Powered by Discuz!', ''));
  var linkStacks = [];

  function parse(jQuerySelector, selecterName, callback) {
    var resources = $(jQuerySelector);
    if (resources) {
      linkStacks.push(selecterName + ': ' + resources.length);
      resources.each(function (index, link) {
        callback(link);
      });
    } else {
      linkStacks.push(selecterName, 0);
    }
  }

  parse('img', 'image', function (link) {
    crawler.push({uri:link.src, type:'img'});
  });

  parse('link[rel="stylesheet"]', 'css', function (link) {
    crawler.push({uri:link.href, type:'css'});
  });

  parse('sscript[src^="static/"]', 'js', function (link) {
    crawler.push({uri:$(link).attr('src'), type:'js'});
  });


  if (config.crawlOptions.recursive) {
    //archive links
    parse('a[href^="archiver/"],a[href^="?tid-"]', 'Archive', function (a) {
      if (a.href.indexOf("nocancer.com.cn") > -1) {
        crawler.push({uri:a.href, type:'link'});
      }
    });

    //forum links
    parse('a[href^="forum.php?gid="] ', 'forum', function (a) {
      if (a.href.indexOf("nocancer.com.cn") > -1) {
        crawler.push({uri:a.href, type:'link'});
      }
    });

    //thread links
    parse('a[href$=".html"]', 'thread&forum', function (link) {
      if (link.href.indexOf("nocancer.com.cn") > -1) {
        crawler.push({uri:link.href, type:'link'});
      }
    });
  }


  //pipe images
  //TODO(mxfli) add attachemen file name
  parse('img[file^="forum.php?mod=attachment"]', "images", function (img) {
    crawler.push({uri:"http://www.nocancer.com.cn/" + img.getAttribute('file'), type:'attachment'});
    crawler.push({uri:"http://www.nocancer.com.cn/" + img.getAttribute('zoomfile'), type:'attachment'});
  });

  //pipe attachments and not need JB
  //TODO(mxfli) add attachemen file name
  parse('a[href^="forum.php?mod=attachment"]', 'attachements', function (attachment) {
    var needJB = $('#' + (attachment.parentNode.id || attachment.id) + '_menu').text().indexOf('金币') > 0;
    if (!needJB) {
      //console.log('attachment:', attachment.href, $('#' + $(attachment).parent().id + '_menu').text());
      crawler.push({uri:attachment.href, type:'attachement'});
    }
  });

  console.log('resouces in page', linkStacks.join(';'));

  callback && callback.call();
};

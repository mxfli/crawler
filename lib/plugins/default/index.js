/**
 * Default crawler plugin.
 * It's an example too.
 * Created by mxfli on 3/31/14.
 * Resource type: attachment,link,image,css
 */
var path = require('path');
var url = require('url');

exports.parseLinks = function ($, handler) {
  "use strict";
  //javascript
  $('script[src]').each(function (index, e) {
    handler.push({uri: $(e).attr('src'), type: 'script'});
  });
  //css
  $('link[href]').each(function (index, e) {
    handler.push({uri: $(e).attr('href'), type: 'css'});
  });
  //image
  $('img[src]').each(function (index, e) {
    handler.push({uri: $(e).attr('src'), type: 'img'});
  });
  //links
  $('a[href]').each(function (index, e) {
    handler.push({uri: $(e).attr('href'), type: 'link'});
  });
};


exports.getFileName = function (uriObj) {
  "use strict";
  var filename, uri = uriObj.uri;
  var urlObj = url.parse(uri, true);
  if (/(css)|(js)/.test(uriObj.type)) {
    filename = urlObj.pathname;
  } else {
    filename = urlObj.path;
  }
  if (/\/$/.test(filename)) {
    filename = path.join(filename, 'index.html');
  }

  return filename;
};

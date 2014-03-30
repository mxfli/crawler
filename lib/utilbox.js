/**
 * FileName: utilbox.js
 * Author: @mxfli
 * CreateTime: 2011-12-30 14:09
 * Description:
 *     a util box for nodeJS.
 */

var path = require('path');
var fs = require('fs');

var url = require('url');
var console = require('./logger').getLogger('debug');
console.log = console.info;

var utilBox = module.exports = {};

var preMkdir = function (_path, cb) {
  //console.log('Checking path:', _path);
  if (!fs.existsSync(_path)) {
    preMkdir(path.dirname(_path), function () {
      fs.mkdirSync(_path);
      cb && cb();
    });
  } else {
    cb && cb();
  }
};

utilBox.preparePath = preMkdir;

utilBox.parseRange = function (str, size) {
  if (str.indexOf(",") != -1) {
    return;
  }

  var range = str.split("-"),
      start = parseInt(range[0], 10),
      end = parseInt(range[1], 10);

  // Case: -100
  if (isNaN(start)) {
    start = size - end;
    end = size - 1;
    // Case: 100-
  } else if (isNaN(end)) {
    end = size - 1;
  }

  // Invalid
  if (isNaN(start) || isNaN(end) || start > end || end > size) {
    return;
  }

  return {start:start, end:end};
};

utilBox.isURL = function (url) {
  var reexp = /^https?:/;
  //TODO(Inaction) http & https only
  //var regxp = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
  return /^https?:/.test(url || '');
};

/**
 * Copy source properties to target, warn: will over write exists propterties in target.
 * @param target
 * @param source
 */
utilBox.copyProperites = function (target, source) {
  Object.keys(source).forEach(function (key) {
    target[key] = source[key];
  });
};

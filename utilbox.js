/**
 * FileName: utilbox.js
 * Author: @mxfli
 * CreateTime: 2011-12-30 14:09
 * Description:
 *     a util box for nodeJS.
 */

var path = require('path');
var fs = require('fs');
var util = require('util');
var url = require('url');

var utilBox = module.exports = {};

var preMkdir = function (_path, cb) {
  //console.log('Checking path:', _path);
  if (!path.existsSync(_path)) {
    preMkdir(path.dirname(_path), function () {
      fs.mkdirSync(_path);
      cb && cb();
    });
  } else {
    cb && cb();
  }
};

utilBox.preparePath = preMkdir;
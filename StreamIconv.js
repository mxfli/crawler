/**
 * FileName: StreamIconv.js
 * Author: @mxfli
 * CreateTime: 2011-12-17 20:48
 * Description:
 *      Stream ICONV convert for node.
 */
var stream = require('stream');
var util = require('util');
var iconv = require('iconv');

//TODO(Inaction) impromve this module to a stream pipe plugin for stream-request.
function StreamIconv() {
  stream.Stream.call(this);

  this.readable = true;
  this.writable = true;
}
util.inherits(StreamIconv);
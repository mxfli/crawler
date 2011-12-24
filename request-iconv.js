var request = require('./request.pipe.js');
var streamBuffers = require("stream-buffers");
var Iconv = require('iconv').Iconv;


//此方法虽然可用，但是并没有从根本上解决编码的问题，如果和从node的层面来解决呢？替换有关encoding的设置的方法还是重写？
module.exports = function requestWithIconv(options, outerCB) {
  console.log("call requests with iconv method.");

  var writableStreamBuffer = new streamBuffers.WritableStreamBuffer();

  function callbackProxy(error, response) {
    var bodyBuffer = writableStreamBuffer.getContents();

    try {
      if (/(gbk)$/i.test(response.headers['content-type'])) {
        var body = new Iconv('GBK', "UTF-8").convert(bodyBuffer).toString()
            .replace("text\/html; charset=gbk", "text\/html; charset=utf-8");
      }
    } catch (e) {
      error = e;
    }
    outerCB(error, response, body || bodyBuffer);
  }

  request(options, callbackProxy).pipe(writableStreamBuffer);
};

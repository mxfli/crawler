/**
 * FileName: attachment-test.js
 * Author: @mxfli
 * CreateTime: 2011-12-30 23:39
 * Description:
 *      Description of attachment-test.js
 */
var att = require('./discuz/attachment.js');

var assert = require('assert');
filePath = att.getAttFilePath('http://www.nocancer.com.cn/forum.php?mod=attachment&aid=MzMyOHw1YmNmMjU0ZnwxMzI1MjU4ODI3fDk5NXw5Nzg2');
console.log(filePath);
assert.ok(filePath);
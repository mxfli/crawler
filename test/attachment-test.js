/**
 * FileName: attachment-test.js
 * Author: @mxfli
 * CreateTime: 2011-12-30 23:39
 * Description:
 *      Description of attachment-test.js
 */
var att = require('../lib/plugins/discuz/attachment.js');

var assert = require('assert');
//filePath = att.getAttFilePath(__dirname,'http://www.nocancer.com.cn/forum.php?mod=attachment&aid=MzMyOHw1YmNmMjU0ZnwxMzI1MjU4ODI3fDk5NXw5Nzg2');
filePath = att.getAttFilePath(__dirname,'http://www.nocancer.com.cn/forum.php?mod=attachment&aid=NTYyMDF8MWY0ZmIwY2J8MTM5NjM2MDYyNnwyMDcwODc');
console.log(filePath);
assert.ok(filePath);
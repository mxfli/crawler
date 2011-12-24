/**
 * This is a request module test.
 */
var fs = require('fs');
var request = require('request');

request('http://ww2.sinaimg.cn/bmiddle/62c2afe6jw1dnt53sds4aj.jpg').pipe(fs.createWriteStream('test.png'));


/**
 * FileName: jsdomTest.js
 * Author: @mxfli
 * CreateTime: 2011-12-15 19:41
 * Description:
 *      Description of jsdomTest.js
 */

var jsdom = require("jsdom");
var fs = require('fs');
var jq = fs.readFileSync('./jquery-1.7.1.min.js').toString();
//console.log(jq);

jsdom.env(
    {
      html: "http://nodejs.org/dist/",
      src: [jq],
      done: function (errors, window) {
        console.log("there have been", window.$("a").length, "nodejs releases!");
      }
    }
);

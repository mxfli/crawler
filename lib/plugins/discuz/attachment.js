"use strict";
/**
 * FileName: attachment.js.js
 * Author: @mxfli
 * CreateTime: 2011-12-29 09:06
 * Description:
 *      Description of attachment.js.js
 *      folder sum =  18G  www.nocancer.com.cn/
 *      after clean: 5.4G
 * ========================================================
 * fix attatchment file name and url check.
 *
 *     function aidencode($aid, $type = 0, $tid = 0) {
 *         global $_G;
 *         $s = !$type ?
 *              $aid.'|'.substr(md5($aid.md5($_G['config']['security']['authkey']).TIMESTAMP.$_G['uid']), 0, 8).'|'.TIMESTAMP.'|'.$_G['uid'].'|'.$tid
 *                   : $aid.'|'.md5($aid.md5($_G['config']['security']['authkey']).TIMESTAMP).'|'.TIMESTAMP;
 *        return rawurlencode(base64_encode($s));
 *     }
 **/
var url = require('url');
var path = require('path');
var fs = require('fs');
var utilBox = require('../../utilbox.js');
var console = require('../../logger.js').getLogger('info');
console.log = console.debug;

var finishedStack = {};

var decode = function (str) {
  return (new Buffer(str, 'base64')).toString();
};

var isAttach = function (uriObj) {
  var query = uriObj.query;
  return (query.mod && query.mod === 'attachment' && query.aid);
};

var attachmentFilePath = function (uriObj) {
  //path name = __dirname/hostname/attachment/tid/uid-paramnames-n
  var realIdArray = decode(uriObj.query.aid).split('|');
  console.log('realId.array: ', realIdArray);
  console.log('16num to 10', parseInt(realIdArray[1], 16));

  var filename = Object.keys(uriObj.query).reduce(function (pre, current, index) {
    console.log(index, 'current:', current, 'pre:', pre);
    //Add other param to filenameArray
    if (!/(mod|aid)/i.test(current)) {
      pre.push(current);
    }
    return pre;
  }, [realIdArray.shift()]);

  console.log('realId.array: ', realIdArray);
  console.log('filename:', filename);

  return path.join('attachment', realIdArray.pop(), filename.join('-'));
};


var clearFishied = function (callback) {
  console.error("Do nothing, The clear finished was stoped.");
  return;

  var finishedDumFile = path.join(__dirname, 'finished.json');
  var finishedDumFile_new = path.join(__dirname, 'finished_new.json');
  fs.readFile(finishedDumFile, function (err, buff) {
    finishedStack = JSON.parse(buff.toString());
    var count = 0;
    Object.keys(finishedStack).some(function (uri, index) {
      var uriObj = url.parse(uri, true);
      if (isAttach(uriObj)) {
        //console.log('uriObj:', uri);
        count += 1;
        //console.log('[', count, '] :', uri);
        var filePath = attachmentFilePath(uriObj);
        //console.log('[', count, '] :', filePath);
        var oldFile = path.join(__dirname, uriObj.hostname, uriObj.path);

        if (fs.existsSync(oldFile)) {
          if (!fs.existsSync(filePath)) {
            //console.log('[', count, ']', 'move oldfile :', oldFile, '\n     to newfile :', filePath);
            utilBox.preparePathSync(path.dirname(filePath));
            fs.renameSync(oldFile, filePath);
          } else {
            fs.unlinkSync(oldFile);
          }
        } else {
          //console.log('[', count, ']', 'old file:', oldFile, 'not exists.');
        }

        delete finishedStack[uri];
      }
      //if (count === 10) {return true;}
      if (count > 0 && count % 100 === 0) {
        console.log('processed : ', count, 'records.')
      }
    });

    console.log('all files count:', count);

    fs.writeFile(finishedDumFile_new, JSON.stringify(finishedStack), function () {
      console.log('dump finished json.');
      callback();
    });
  });
};

var cleanAttFiles = function () {
  fs.readdir(path.join(__dirname, 'run', config.requestOptions.host), function (err, files) {
    if (err) throw err;
    var count = 0;
    files.forEach(function (file) {
      var uriObj = url.parse('http://' + config.requestOptions.host + '/' + file, true);
      if (isAttach(uriObj)) {
        var filePath = attachmentFilePath(uriObj);
        //console.log('[', count, '] :', filePath);
        var oldFile = path.join(__dirname, uriObj.hostname, uriObj.path);
        if (!fs.existsSync(filePath)) {
          //console.log('[', count, ']', 'move oldfile :', oldFile, '\n     to newfile :', filePath);
          utilBox.preparePathSync(path.dirname(filePath));
          fs.renameSync(oldFile, filePath);
        } else {
          fs.unlinkSync(oldFile);
        }
        count += 1;
      }
    });
    console.log('found:', files.length, 'files, attachments:', count, 'moved.');
  });
};

exports.getAttFilePath = function (uri) {
  var urlObj = url.parse(uri, true);
  return attachmentFilePath(urlObj);
};

exports.clear = function () {
  clearFishied.call(null, cleanAttFiles);
};

exports.isAttach = isAttach;
/**
 * Helper functions for parser.
 * Created by mxfli on 4/14/14.
 */

exports.parse = function ($, jQueryObject, resourceType, callback) {
  jQueryObject.each(function (index, link) {
    callback($(link));
  });
};

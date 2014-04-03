/**
 * Test cookies is right
 * Created by mxfli on 4/3/14.
 */

require('../config/config');
var assert = require('assert');
var cookiesAgent = require('cookies.txt');

cookiesAgent.parse(__dirname + '/../example/ngotcm_cookies.txt', function (cookies) {
  "use strict";
  console.log('config:\n', config.requestOptions.Cookie);
  console.log('cookies.txt:\n', cookies.map(function (i) {
    return i.name + '=' + i.value;
  }).join(';'));

  assert(cookies.some(function (cookie) {
    return config.requestOptions.Cookie.indexOf(cookie.name);
  }));

  //console.dir(cookies);

  console.log('match details:', cookies.map(function (cookie) {
    return cookie.name + ':' + (config.requestOptions.Cookie.indexOf(cookie.name) !== -1);
  }));

  console.log('config cookies:',config.requestOptions.Cookie.split('; '))
});

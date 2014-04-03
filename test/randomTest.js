/**
 * Created by mxfli on 4/3/14.
 */

var flag = 10000;
var random = Math.random;
for (var i = 0; i < 100; i++) {
  console.log(i, 'random value:', random()*flag + 4000);
}
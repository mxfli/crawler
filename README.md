[![Build status](https://travis-ci.org/mxfli/crawler.png)](https://travis-ci.org/mxfli/crawler)
crawler
======
 A node.js crawler support custom plugin to implement special crawl rules.
 Implement plugin example for crawl discus2x.

###Finished Features
* Crawl site;
* Filter: include/exclude URL path of the site.
* Plugin: discuz2.0 attachments,discuz2.0 filter.
* Queue and Crawl status.
* Update mode.
* Support wget cookies config. You can export site cookie use Cookie exporter.
* Use jsdom and jQuery to get needed resources of crawled page.
* gbk to utf-8 convert.

##Feature List：reference：http://obmem.info/?p=753
*   Support request.pipe, crawl site all in stream.pip mode.
*	Basic crawl site；
*   Proxy support；
*   Need Login？cookie auth；update and save cookie data;
      - form login？
      - support cookie
      - Browser UserAgent setting.
      - Multi-proxy support
*   Monitor：disk usage？ total pages count, crawled count，crawling count，speed，memory usage，failed list;
*   CP：Monitor viewer; start/pause/stop crawler; failed/retry; change config;
*   gzip/deflate: 5 times speedup；’accept-encoding’
*   Multi-workers/Async

##Install
``` npm install crawlit ```
##Usage
Basic usage:

```
var crawlIt = require('crawlit');
crawlIt.init({update:false});
//start crawl
crawlIt.crawl('http://domain/path');
//Add other crawl interface
crawlIt.push('/path2');
crawlIt.push('/path2');
```

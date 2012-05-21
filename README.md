#crawler about
This is a site crawler for clone Discuz Forums.

###Finished List
*   递归抓站 + 指定规则的地址抓取和指定资源的下载；
*   支持discuz附件的不重复下载和保存；
*   手动执行CSS下载需要的资源；
*   简单的镜像服务器：discuz
*   下载队列，和队列的持久化，支持更新和下载模式。
*   配置文件调整下载的模式和一些全局配置。
*   支持weget格式的cookies.txt文件，比较方便使用，和request库可以兼容。
*   采用jsdom，支持jQuery，可以是哦用jQuery的选择器来过滤需要抓取的资源。

###TODO list
*   重构，代码可读；
*   增加request.pipe库的实例，并完成dom和stream两种方式的对比。

##Feature List：reference：http://obmem.info/?p=753
*	基本抓站；
*   Proxy support；
*   需要登录？cookie athoug验证；保存cookie;
      - 表单登录？
      - 支持cookie
      - 浏览器伪装
      - 反倒链功能
      - 代理服务器支持
      - 验证码？只能用监控了，出现验证码就停止。或者去验证；
*   Monitor：使用硬盘的大小？已知的主题数目，已经下载的数目，使用的未来的主题数目，性能，内存；失败列表;
*   gzip/deflate 速度会快5倍左右；’accept-encoding’
*   Encoding:gbk gb18030 gb2312 -> UTF-8
*   多任务同时下载/异步下载；nodejs的强项；
*   Exelude URL：清除cookie；外站链接；退出链
*   Plugins：正常情况下只提供正常的网页下载功能，特殊情况下：JS修改才能正确显示的站点，通过插件进行下载其资源；
*   Multi-thread：对一个文件进行多线程下载？可以提高单个文件的下载效率，针对网络不好的情况有效。超过N大小的自动启用该插件。
*   Tests
*   CP：显示监控情况；暂停和启动crawler；失败列表/重试；调整参数/配置文件；
*   Bug收集：帖子主题显示错误/图片不能下载或不存在/空间不存在/
*   Update mode:重新下载某人的空间/重新抓取某主题这样可以不需要自动识别更新，自动识别的话采用最后一页或者URL识别，打标记。


##RequiredModules
*   request
*   iconv-lite/iconv
*   cookie? cookies.txt
*   SAX Stream HTML parser
*   DOM
*   JQuery

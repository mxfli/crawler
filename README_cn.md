#crawler 说明
 开始是为了下载《天下无癌网》，开始试用了几个crawl库，不太好用，Discuz论坛抓站不方便，就自己写了这个工具，目前是第3版，但代码还没有重构，还很乱。
后来从request库的使用再加上VPS的内存限制，想到了基于 _Stream.pipe()_ 并结合connect router风格的__request.pipe__库，这个模块应该在node.JS客户端编程中很有用。
由于jsdom的内存泄露（解决：要在结尾调用```window.close()```）；discuz附件地址不固定导致VPS爆盘；和无癌网关站在即（最后即时更新模式），用request和jsdom+forver完成了目前的第三版。并借用（ping）的静态服务器+自定义文件路径，提供了简单的镜像访问。

###已有功能
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

-------------------------------------------
__下面是初始需求和一些规划:__
===========================================
##天下无癌网站克隆器功能需求

1. 下载网站全部资源，每日更新最新资源，爬虫功能。包括的功能:所有站内链接有唯一的ID对应到一个具体的文件。扫描和下载应该分开。
2. 开方主题下载功能，可以将自己喜欢的主题打包下载，zip格式。输入主题的ID即可；需要网页入口；
3. 其他功能暂无。

##其他功能：参考：http://obmem.info/?p=753
*	基本抓站；
*   使用代理服务器；
*   需要登录？cookie athoug验证；保存cookie;
      - 表单登录？
      - 支持cookie
      - 浏览器伪装
      - 反倒链功能
      - 代理服务器支持
      - 验证码？只能用监控了，出现验证码就停止。或者去验证；
*   监控：使用硬盘的大小？已知的主题数目，已经下载的数目，使用的未来的主题数目，性能，内存；失败列表;
*   支持压缩 gzip/deflate 速度会快5倍左右；’accept-encoding’
*   编码支持，gbk gb18030 gb2312 -> UTF-8
*   多任务同时下载/异步下载；nodejs的强项；
*   排除的URL：清除cookie；外站链接；退出链 
*   插件功能：正常情况下只提供正常的网页下载功能，特殊情况下：JS修改才能正确显示的站点，通过插件进行下载其资源；
*   多线程插件：对一个文件进行多线程下载？可以提高单个文件的下载效率，针对网络不好的情况有效。超过N大小的自动启用该插件。
*   测试的
*   控制面板：显示监控情况；暂停和启动crawler；失败列表/重试；调整参数/配置文件；
*   Bug收集：帖子主题显示错误/图片不能下载或不存在/空间不存在/
*   重新下载某人的空间/重新抓取某主题这样可以不需要自动识别更新，自动识别的话采用最后一页或者URL识别，打标记。

##设计
	采用NodeJS实现，方便快捷？
	
*  下载站内的所有资源和页面内需要引用的所有资源：站外资源可能会有：图片，JS，CSS，MP3？，视频？，注：图片是重点；
*  下载的每个URI对应要存储到文件中，如果是动态链接需要保存到数据库中，数据采用mongodb？
*  有些人的好友和个人消息是封闭的，不能下载？发贴建议他们能打开。
*  URI地址统一转换为动态地址按照ID进行整业存储；
*  home.php相关的地址不进行递归，但第一遇到的图片除外；
*  或者只处理thread，forum.php相关的地址？ 存档地址也可以保存；打印地址也可以保存；没有元数据，这些进行保存还是有必要的。
*  下载的保存和常规不同？ 有attache标记，文件名采用<a>文件名</a>链接内的描述作为文件名；
*  要有一个小工具控制发起链接的数量和递归。

*  要有一个配置文件填写需要的cookie；否则很多东西不能下载；
*   有下载需要扣金币的要掠过，我没有那么多的积分可用。识别呢？
## 流程：下载模式
1. 将Cookie上传到配置文件；用代理的方式登陆网站，记录cookie并用代理的机器直接下载。
2. 执行nodeJS代码；从制定的URL开始进行递归下载。
3. 系统启动，初始化数据库，数据库中按照URL——每个独立的不重复的页面，采用一定规则进行hash存储，地址和内容都有Hash值，看看是否进行了更新；
4. 分析这个URL根据实际情况转换为系统需要的地址，参考nginx的URL重写模式 discus2.0专用；	
5. 启动后根据这个地址，在数据库中查找看看是否进行过更新，如果没有进行过更新则不进行任何处理，如果进行过更新则开始下载进行更新流程；
6. 将这个地址加入到队列中，等待下载；
7. 下载这个文件并进行转码，GBK-》UTF-8，同时将META中的charset标记修改为UTF-8。将页面进行保存到数据库，保存是同时将页面进行hash处理；
8. 分析这个页面的内容，将 CSS,JS,IMG加入队列进行下载，并按照URL规则进行保存并hash。CSS文件和html文件要进行URL解析下载里面的资源文件。
9. 分析所有的<a>链接，并将其加入队列进行下载；要检查入站规则，否则不进行下载——原则，只下载必要的显示内容。

## NodeJS需要的模块
*   request
*   iconv-lite
*   cookie支持？
*   SAX Stream HTML处理插件
*   DOM插件
*   支持JQuery这个应该有，方便操作。
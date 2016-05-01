用Express + Socket.io + MongoDB实现简易聊天室
=============================================

最近做大作业需要研究一下Node.js，需要了解node与mongoDB的链接，前后端的通信，后端的逻辑结构等，怎么快速上手呢？那就做个聊天室吧。

## 安装Node.JS和MongoDB

Node.js就不多说了，MongoDB可以看我上一篇[博客](http://www.xiao555.club/2016/04/30/win7%20%E5%AE%89%E8%A3%85MongoDB/)

## 构建Express项目

找一个合适的地方：

```
mkdir chatroom

cd chatroom

npm install express

express -e  //-e 是用ejs作为模板引擎

npm install //安装依赖，目录在package.json中
```

这样就创建好了，结构如下：

```
- chatroom

	- bin
		- www           //配置端口启动文件
	- node_modules		//下载的模块
		- express
	- public			//静态资源
		- images
		- javascripts
		- stylesheets
	- routes			//后端逻辑、路由
		- index.js
		- users.js
	- views				//视图
		- error.ejs
		- index.ejs
	- app.js 			//入口文件，相当于main();
	- package.json 		//配置信息

```
我按照个人习惯做一些调整

```
- chatroom

	- node_modules		//下载的模块
		- express
	- public			//静态资源
		- img
		- js
		- css
	- routes			//后端逻辑、路由
		- index.js
		- users.js
	- views				//视图
		- error.ejs
		- index.ejs
	- app.js 			//入口文件，相当于main();
	- package.json 		//配置信息
```
我把public目录下目录改一下名称，www文件删了，用app.js作为启动文件，就需要修改一下app.js：

```
var debug = require('debug')('chat');
//var users = require('./routes/users');	//单页面不需要这个

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function(){
  debug('Express server listening on port ' + server.address().port);
})

//app.use('/users', users);

```
增加，注释这些后，运行 `DEBUG=chatroom & node app.js` 或 `node app.js` ,然后浏览器打开[127.0.0.1:3000](127.0.0.1:3000),如下图所示，就说明配置好了

<img src="http://ww3.sinaimg.cn/mw1024/005NJVkbjw1f3fsnv448uj311y0kg0vk.jpg">

## 实现前端页面

这个没什么好说的，修改views目录下的index.ejs文件，效果如下：

<img src="http://ww3.sinaimg.cn/mw1024/005NJVkbjw1f3ftv2386qj311y0kg0wl.jpg">


## 数据库设计

注意使用数据库前一定要先开启mongodb服务！

安装 mongodb 和 mongoose 模块：

```
npm install mongodb mongoose
```

在主目录下新建chat_server.js :

```
var mongoose = require('mongoose');

//连接数据库
var db = mongoose.createConnection('localhost','chatroom');
db.on('error',function(err) {
	console.error(err);
});
var Schema = mongoose.Schema;

//聊天记录表
var ChatSchema = new Schema({
	nickname: String,
	time: String,
	content: String
});
var ChatModel = db.model('chats',ChatSchema);


// 这里的listen函数在 app.js 文件中被调用
exports.listen = function(_server){
	return io.listen(_server);
}

```
在app.js中增加：

```
require('./chat_server').listen(server);

```


## 前后端通信Socket.io

借用这篇[博客](http://my.oschina.net/voler/blog/626226?fromerr=UumMewCx)里讲的介绍一下socket.io：

首先先简单讲解下Socket.io的原理. 操作系统有一个非常伟大的设计就是轮询机制,而Node.js中的callback机制正是基于此机制:

<img src="http://static.oschina.net/uploads/space/2016/0301/084929_dx2L_1017135.png">

JS的异步编程就是这么来的.但是对于类似聊天这种应用,使用轮询机制明显不合理.轮询机制在于你触发了一个事件后异步处理,但这里异步本身就是硬伤,毕竟聊天要实时的.

而Node.js中有另外一种伟大的模型: 观察者模式. 即我就一直监听,监听到的某个事件后,执行相应的处理函数.

<img src="http://static.oschina.net/uploads/space/2016/0301/084956_5TlW_1017135.png">

### 举个栗子

在chat_server.js中添加：

```
var io = require('socket.io')();
var xssEscape = require('xss-escape');

var nickname_list = [];

// 检查是昵称是否已经存在
function HasNickname(_nickname){
	for(var i=0; i<nickname_list.length; i++){
		if(nickname_list[i] == _nickname){
			return true;
		}
	}
};

// 删除昵称
function RemoveNickname(_nickname){
	for(var i=0; i< nickname_list.length; i++){
		if(nickname_list[i] == _nickname){
			nickname_list.splice(i, 1);
		}
	}
}

io.on('connection', function(_socket){
	console.log(_socket.id + ':connection');

	// 向当前用户发送命令和消息
	_socket.emit('user_list', nickname_list);
	_socket.emit('need_nickname');
	_socket.emit('server_message','欢迎来到聊天室 :)');

	// 监听当前用户的请求和数据

	// 离开 
	_socket.on('disconnect', function(){
		console.log(_socket.id + ':disconnect');
		if(_socket.nickname != null && _socket.nickname != ""){
			// 广播 用户退出
			_socket.broadcast.emit('user_quit', _socket.nickname);
			RemoveNickname(_socket.nickname);
		}
	});

	// 添加 和 修改 昵称
	_socket.on('change_nickname', function(_nickname, clr){
		console.log(_socket.id + ': change_nickname('+_nickname+')');

		_nickname = xssEscape(_nickname.trim());

		// 半角替换为tt，模拟为全角字符判断长度
		var name_len = _nickname.replace(/[^\u0000-\u00ff]/g, "tt").length;

		// 字符长度必须在4到16个字符之间
		if(name_len < 4 || name_len > 16){
			return _socket.emit('change_nickname_error', '请填写正确的用户昵称，应在4到16个字符之间。')
		}

		// 昵称重复
		if(_socket.nickname == _nickname){
			return _socket.emit('change_nickname_error', '你本来就叫这个名字。')
		}

		// 昵称已经被占用
		if(HasNickname(_nickname)){
			return _socket.emit('change_nickname_error', '此昵称已经被占用。')
		}

		var old_name = '';
		if(_socket.nickname != '' && _socket.nickname != null){
			old_name = _socket.nickname;
			RemoveNickname(old_name);
		}

		nickname_list.push(_nickname);
		_socket.nickname = _nickname;
		_socket.color = clr;

		console.log(nickname_list);

		_socket.emit('change_nickname_done', old_name, _nickname, clr);

		if(old_name == ''){
			// 广播 用户加入
			return _socket.broadcast.emit('user_join', _nickname);
		}else{
			// 广播 用户改名
			return _socket.broadcast.emit('user_change_nickname', old_name, _nickname);
		}
	});

	// 说话
	_socket.on('say', function(_time, _content){
		if('' == _socket.nickname || null == _socket.nickname){
			return _socket.emit('need_nickname');
		}

		_content = _content.trim();
		var chatinfo = new ChatModel();
		chatinfo.nickname = _socket.nickname;
		chatinfo.time = _time;
		chatinfo.content = _content;
		chatinfo.save(function(err) {
			if (err) throw err;
		});
		ChatModel.find({nickname: _socket.nickname},function(err,data) {
			if (err) {
	 		console.log('存储失败' + err);
	 		return;
	 		} else {
	 		console.log('存储成功：' + data);
	 		}
		});
		console.log(_socket.nickname + ': say('+_content+')');
		// 广播 用户新消息
		_socket.broadcast.emit('user_say', _socket.nickname, xssEscape(_content), _socket.color);
		return _socket.emit('say_done', _socket.nickname, xssEscape(_content), _socket.color);
	});

	//显示历史记录
	_socket.on('show_history',function(clr){
		console.log('ok');
		ChatModel.find({},function(err,data) {
			if (err) {
	 		console.error(err);
	 		return;
	 		} else {
	 			console.log('data = ' + data);
	 			console.log(data[0].nickname);
	 			for(var i = 0;i < data.length;i++){
					console.log(data[i].nickname, data[i].time, xssEscape(data[i].content), clr);
					_socket.emit('return_history', data[i].nickname, data[i].time, xssEscape(data[i].content), clr);
				}
	 		} 
		});
	});
})

```
这是后端的响应机制，前端逻辑在public目录下js中的index.js中,这里就简单举个例子，显示历史消息：

```
var chat_Utils, 	//聊天室 工具类
	chat_UI, 		//聊天室 界面逻辑
	chat_Socket; 	//聊天室 数据逻辑

// 与后台服务器建立websocket连接
var chat_server = "http://" + location.hostname + ':3000';
var socket = io.connect(chat_server);


chat_UI = {
	init: function(){
		this.historyShow();		//点击显示历史消息事件
	},
	historyShow:function(){
			var self = this;
			$("#showHistory").on('click',function() {
				if($('#history-modal').css('display') == 'none') {
					$('.history-list-body').empty();
				}
				$("#history-modal").modal('show');
				chat_Socket.showHistory(chat_Utils.getUserColor());
			})
	},
	chatBodyToBottom: function(){
		var chat_body = $('.chat-body');
		var height = chat_body.prop('scrollHeight');
		chat_body.prop('scrollTop', height);
	},
	addHistoryMessage: function(_time, _content, _name, clr){
		var history_list = $('.history-list-body');
		_content = QxEmotion.Parse(_content);
		var msgAlignCls = _name ==$('#my-nickname').text() ? 'msg-right':'msg-left';
		history_list.append(
			'<div class="msg-item clearfix '+msgAlignCls+'">\
					<div class="msg-avatar" style="background-color:'+clr+';"><i class="glyphicon glyphicon-user"></i></div>\
					<div class="msg-con-box" style="background-color:'+clr+';">\
						<p class="con">'+_content+'</p>\
						<time class="time">'+_time+'</time>\
					</div>\
				</div>'
			);
		this.chatBodyToBottom();

	},
};

chat_Socket = {
	init:function(){
		this.chatHistoryEv();//监听后端 获取历史消息	
	},
	showHistory:function(clr){
		socket.emit('show_history',clr);
	},
	chatHistoryEv:function(){
		socket.on('return_history',function(_nickname, _time, _content, clr) {
			console.log(_nickname, _time, _content, clr);
			chat_UI.addHistoryMessage(_time, _content, _nickname, clr);
		});
	},
}

chat_UI.init();
chat_Socket.init();
```

我们过一下思路，首先当用户点击显示历史消息时，调用chat_UI.historyShow函数，先清空一下历史记录列表，然后显示历史记录弹窗，调用chat_Socket.showHistory函数：

```
historyShow:function(){
			var self = this;
			$("#showHistory").on('click',function() {
				if($('#history-modal').css('display') == 'none') {
					$('.history-list-body').empty();
				}
				$("#history-modal").modal('show');
				chat_Socket.showHistory(chat_Utils.getUserColor());
			})
	},
```

chat_Socket.showHistory这个函数调用socket.emit发射show_history事件：

```
showHistory:function(clr){
		socket.emit('show_history',clr);
	},
```

后端chat_server.js 中用socket.on('show_history')捕获了这一事件,从数据库中获取数据发送return_history事件到前端：

```
//显示历史记录
	_socket.on('show_history',function(clr){
		console.log('ok');
		ChatModel.find({},function(err,data) {
			if (err) {
	 		console.error(err);
	 		return;
	 		} else {
	 			for(var i = 0;i < data.length;i++){
					_socket.emit('return_history', data[i].nickname, data[i].time, xssEscape(data[i].content), clr);
				}
	 		} 
		});
	});
```
前端index.js 中 chat_Socket.chatHistoryEv()函数捕获return_history事件，调用chat_UI.addHistoryMessage添加到历史记录列表中：

```
chatHistoryEv:function(){
		socket.on('return_history',function(_nickname, _time, _content, clr) {
			console.log(_nickname, _time, _content, clr);
			chat_UI.addHistoryMessage(_time, _content, _nickname, clr);
		});
	},
```

整个显示历史记录的过程就结束了。

## 数据库的操作

前面我们已经设计好了数据库：

```
var mongoose = require('mongoose');

//连接数据库
var db = mongoose.createConnection('localhost','chatroom');
db.on('error',function(err) {
	console.error(err);
});
var Schema = mongoose.Schema;

//聊天记录表
var ChatSchema = new Schema({
	nickname: String,
	time: String,
	content: String
});
var ChatModel = db.model('chats',ChatSchema);

```
数据库的设计包括Schema 模式(数据记录的格式)、Model 编译模型、Documents 文档实例化。上面的代码中我们连接了chatroom数据库，设计了ChatSchema模式，编译了ChatModel 模型，编译好模型后我们创建一条新的记录只需要new一下就行。

### 保存新数据

```
var chatinfo = new ChatModel();
		chatinfo.nickname = _socket.nickname;
		chatinfo.time = _time;
		chatinfo.content = _content;
		chatinfo.save(function(err) {
			if (err) throw err;
		});
```
### 查询数据

```
ChatModel.find({nickname: _socket.nickname},function(err,data) {
			if (err) {
	 		console.log('存储失败' + err);
	 		return;
	 		} else {
	 		console.log('存储成功：' + data);
	 		}
		});
```
除了.find() 查找所有符合的数据，还有.findOne() 查找一条数据，第二个参数中的data就是返回的数据。

至此基本的逻辑和操作我们都了解了，接下来就是Codeing的时间了！

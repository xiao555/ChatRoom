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
}

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
	_socket.on('say', function(_content){
		if('' == _socket.nickname || null == _socket.nickname){
			return _socket.emit('need_nickname');
		}

		_content = _content.trim();

		console.log(_socket.nickname + ': say('+_content+')');
		// 广播 用户新消息
		_socket.broadcast.emit('user_say', _socket.nickname, xssEscape(_content), _socket.color);
		return _socket.emit('say_done', _socket.nickname, xssEscape(_content), _socket.color);
	});
})

// 这里的listen函数在 bin/www 文件中被调用
exports.listen = function(_server){
	return io.listen(_server);
}
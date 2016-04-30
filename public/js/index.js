/**
 * index.js 聊天室页面逻辑
 * deps:[jquery.js, socket.io.js, emotion.js]
 * email:935486956@qq.com
 */
var chat_Utils, 	//聊天室 工具类
	chat_UI, 		//聊天室 界面逻辑
	chat_Socket; 	//聊天室 数据逻辑

// 与后台服务器建立websocket连接
var chat_server = "http://" + location.hostname + ':3000';
var socket = io.connect(chat_server);

chat_Utils = {
	getLocalHMS: function(){
		var d = new Date();
		var t = [d.getHours(), d.getMinutes(), d.getSeconds()];
		t = t.map(function(v, i){ return v < 10 ? '0' + v : v; })
		return t.join(':');
	},
	getUserColor:function(){
		// 生成当前用户头像背景颜色
		var c1 = Math.ceil(Math.random()*(240-160+1)+160).toString(16);
		var c2 = Math.ceil(Math.random()*(240-190+1)+190).toString(16);
		var c3 = Math.ceil(Math.random()*(240-190+1)+190).toString(16);
		return '#'+c1+''+c2+''+c3;
	},
	getStringLength: function(_str){
		return _str.replace(/[^\u0000-\u00ff]/g, "tt").length;
	}
}

chat_UI = {
	init:function(){
		this.initEmotion(); //初始化表情插件

		this.nameEditModalShowEv(); //注册 点击弹出修改昵称弹窗事件
		this.sendMsgEv(); 			//注册 发送消息事件
		this.subNameEv(); 			//注册 提交昵称事件
		
		this.loginModalShowEv(); 	//弹窗打开时调整弹窗样式
		this.loginModalShownEv();	//弹窗打开后input获取焦点
		 
		this.historyShow();		//点击显示历史消息事件
		this.historyDel();		//弹窗关闭的时候清空历史记录
	},
	historyDel:function(){
		if($('#history-modal').attr('style') == 'display: none;') {
			$('.history-list-body').empty();
		}
	},
	initEmotion:function(){
		QxEmotion($('#emotion-btn'), $('#input-edit'));
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
	addMessage: function(_time, _content, _name, clr){
		// 如果没有_name 则为系统消息
		// 如果_name为当前用户，则消息置右，否则置左
	
		var msg_list = $('.msg-list-body');
		_content = QxEmotion.Parse(_content);

		if(_name){
			var msgAlignCls = _name ==$('#my-nickname').text() ? 'msg-right':'msg-left';

			msg_list.append(
				'<div class="msg-item clearfix '+msgAlignCls+'">\
					<div class="msg-avatar" style="background-color:'+clr+';"><i class="glyphicon glyphicon-user"></i></div>\
					<div class="msg-con-box" style="background-color:'+clr+';">\
						<p class="con">'+_content+'</p>\
						<time class="time">'+_time+'</time>\
					</div>\
				</div>'
			);
		}else{
			msg_list.append(
				'<div class="text-center msg-sys">\
					<span class="sys-tip">系统消息：'+_content+'<small>&emsp;'+_time+'</small></span>\
				</div>'
			);
		}
		this.chatBodyToBottom();
	},
	removeListUser: function(_user){
		$('.list-table tr').each(function(){
			if(_user == $(this).find('td').text()){
				$(this).remove();
			}
		});
	},
	addUserToList: function(_user){
		$('.list-table').append('<tr><td>'+ _user +'</td></tr>');
	},
	useUserList: function(_user_list){
		$('.list-table').html('');
		for(var i = 0; i < _user_list.length; i++){
			this.addUserToList(_user_list[i]);
		}
		this.updateListCount();
	},
	updateListCount: function(){
		var list_count = $('.list-table').find('tr').length + 1;
		$('#list-count').text('当前在线：'+ list_count + '人');
	},
	sendMessage: function(){
		if( '' == $.cookie() || null == $.cookie('chat_nickname')){
			return $('#login-modal').modal('show');
		}

		var edit = $('#input-edit');
		var content = edit.val();
		if('' == content){
			return;
		}
		chat_Socket.say(content);
		edit.val('');
	},
	applyNickname: function(){
		var nickname_edit = $('#nickname-edit');
		var nickname_error = $('#nickname-error');
		var name = nickname_edit.val();

		if('' == name){
			nickname_error.text('请填写昵称。')
			nickname_error.show();
			nickname_edit.focus();
			return;
		}

		var name_len = chat_Utils.getStringLength(name);
		if( name_len < 4 || name_len >16){
 			nickname_error.text("请填写正确的昵称，应为4到16个字符。");
	    	nickname_error.show();
			return;
		}

		if(name == $.cookie('chat_nickname')){
			nickname_error.text("你本来就叫这个。");
			nickname_error.show();
		}

		chat_Socket.changeNickname(name, chat_Utils.getUserColor());
	},
	sendMsgEv:function(){
		var self = this;
		$('#input-edit').keydown(function(_event) {
		   if(13 == _event.keyCode) {
		       self.sendMessage();
		   }
		});
		$('#sendMsgBtn').on('click', function(){
			self.sendMessage();
		})
	},
	nameEditModalShowEv:function(){
		var self = this;
		$('#nicknameEditBtn').on('click', function(){
			$('#login-modal').modal('show');
		})
	},
	//注册 提交昵称事件
	subNameEv:function(){
		var self = this;
		$('#nickname-edit').keydown(function(_event) {
		    if(13 == _event.keyCode) {
		        self.applyNickname();
		    }
		});

		$('#applyNicknameBtn').on('click', function(){
			self.applyNickname();
		})
	},
	loginModalShowEv:function(){
		$("#login-modal").on("show.bs.modal", function (_event) {
			$(this).css({
			    "display": "block",
			    "margin-top": function () {
			        return ($(this).height() / 3);
			    }
			});
		    $('#nickname-edit').val("");
		    $("#nickname-error").hide();
		});
	},
	loginModalShownEv:function(){
		$("#login-modal").on("shown.bs.modal", function (_event) {
		    $('#nickname-edit').focus();
		});
	},
	historyShow:function(){
		var self = this;
		$("#showHistory").on('click',function() {
			if($('#history-modal').css('display') == 'none') {
			$('.history-list-body').empty();
			console.log('OK');
			}
			$("#history-modal").modal('show');
			console.log("调用");
			chat_Socket.showHistory(chat_Utils.getUserColor());
		})
	}
};

chat_Socket = {
	init:function(){
		console.log('server:' + chat_server);

		this.needNicknameEv(); //监听后端 需要昵称 事件
		this.serverMessageEv(); //监听后端 用户新消息 事件
		this.changeNicknameErrorEv(); //监听后端 昵称错误 事件
		this.changeNicknameDoneEv();  //监听后端 昵称添加成功 事件
		this.sayDoneEv();  //监听后端 用户新消息 事件
		this.userListEv(); //监听后端 显示用户列表 事件
		this.userChangeNicknameEv(); //监听后端 修改昵称提示 事件
		this.userJoinEv(); //监听后端 新用户加入 广播
		this.userQuitEv(); //监听后端 用户离开 广播
		this.userSayEv();  //监听后端 其它用户消息 广播
		this.chatHistoryEv();//监听后端 获取历史消息
	},
	showHistory:function(clr){
		socket.emit('show_history',clr);
		console.log('show');
	},
	chatHistoryEv:function(){
		socket.on('return_history',function(_nickname, _time, _content, clr) {
			console.log(_nickname, _time, _content, clr);
			chat_UI.addHistoryMessage(_time, _content, _nickname, clr);
		});
	},
	changeNickname:function(_nickname, clr){
		socket.emit('change_nickname', _nickname, clr);
	},
	say:function(_content){
		socket.emit('say', chat_Utils.getLocalHMS(), _content);
	},
	needNicknameEv:function(){
		var self = this;
		socket.on('need_nickname', function(){
			if(null == $.cookie('chat_nickname')){
				$('#login-modal').modal('show');
			}else{
				self.changeNickname($.cookie('chat_nickname'), chat_Utils.getUserColor());
			}
		});
	},
	serverMessageEv:function(){
		socket.on('server_message', function(_message){
			chat_UI.addMessage(chat_Utils.getLocalHMS(), _message);
		});
	},
	changeNicknameErrorEv:function(){
		socket.on('change_nickname_error', function(_error_msg){
			console.log('change_nickname_error : ' + _error_msg);
			$('#login-modal').modal('show');
			$("#nickname-error").text(_error_msg);
			$("#nickname-error").show();
			$('#nickname-edit').focus();
		});
	},
	changeNicknameDoneEv:function(){
		socket.on('change_nickname_done', function(_old_name, _new_nickname, clr){
			console.log('change_nickname_done(' + _new_nickname + ',' + _old_name + ')');
			$.cookie('chat_nickname', _new_nickname);

			$('#login-modal').modal('hide');
			$('#my-nickname').text(_new_nickname);

			if(_old_name != null && _old_name != ''){
				chat_UI.addMessage(chat_Utils.getLocalHMS(), '[' + _old_name + '] 改名为 [' + _new_nickname + ']');
			}

			chat_UI.updateListCount();
		});
	},
	sayDoneEv:function(){
		socket.on('say_done', function(_nick_name, _content, clr){
			console.log('user_say(' + _nick_name + ', ' + _content + ')');
			chat_UI.addMessage(chat_Utils.getLocalHMS(), _content, _nick_name, clr);
		});
	},
	userListEv:function(){
		socket.on('user_list', function(_list){
			chat_UI.useUserList(_list);
		});
	},
	userChangeNicknameEv:function(){
		socket.on('user_change_nickname', function(_old_nick_name, _new_nick_name){
			console.log('user_change_nickname(' + _old_nick_name + ', ' + _new_nick_name + ')');
			chat_UI.removeListUser(_old_nick_name);
			chat_UI.addUserToList(_new_nick_name);
			chat_UI.addMessage(chat_Utils.getLocalHMS(), '[' + _old_nick_name + '] 改名为 [' + _new_nick_name + ']');
		});
	},
	userJoinEv:function(){
		socket.on('user_join', function(_nick_name){
			console.log('user_join(' + _nick_name + ')');
			chat_UI.addUserToList(_nick_name);
			chat_UI.updateListCount();
			chat_UI.addMessage(chat_Utils.getLocalHMS(), '[' + _nick_name + '] 进入了聊天室。');
		});
	},
	userQuitEv:function(){
		socket.on('user_quit', function(_nick_name){
			console.log('user_quit('+_nick_name+')');
			chat_UI.removeListUser(_nick_name);
			chat_UI.updateListCount();
			chat_UI.addMessage(chat_Utils.getLocalHMS(), '['+_nick_name+']离开了聊天室。');
		});
	},
	userSayEv:function(){
		socket.on('user_say', function(_nick_name, _content, clr){
			console.log('user_say(' + _nick_name + ', ' + _content + ')');
			chat_UI.addMessage(chat_Utils.getLocalHMS(), _content, _nick_name, clr);
		});
	}
}


chat_UI.init();
chat_Socket.init();






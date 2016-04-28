

var chat_Utils = {
	getLocalHMS: function(){
		var d = new Date();
		var t = [d.getHours(), d.getMinutes(), d.getSeconds()];
		t.map(function(v, i){ return v < 10 ? '0' + v : v; })
		return t.join(':');
	},
	getStringLength: function(){
		return _str.replace(/[^\u0000-\u00ff]/g, "tt").length;
	},
	GetVisibilityKey: function(){
		var state, hidens = ['', 'webkit', 'moz', 'ms'];
		hidens.forEach(function(v, i){
			if(typeof document[v==''?'hidden':v+'Hidden'] !== 'undefined')
				return state = v + 'visibilityState';
		});
		return state;
	}
}

var chat_UI = {
	init:function(){
		this.initEmotion();

		this.sendMsgKeydownEv();
		this.nameEditKeydownEv();
		this.dialogShowEv();
		this.loginModalShowEv();
		this.loginModalShownEv();
	},
	initEmotion:function(){
		QxEmotion($('#emotion-btn'), $('#input-edit'));
	},
	chatBodyToBottom: function(){
		var chat_body = $('.chat-body');
		var height = chat_body.prop('scrollHeight');
		chat_body.prop('scrollTop', height);
	},
	addMessage: function(_name, _time, _content){
		var msg_list = $('.msg-list-body');
		_content = QxEmotion.Parse(_content);
		msg_list.append(
			'<div class="clearfix msg-wrap"><div class="msg-head">'+
			'<span class="msg-name label label-primary pull-left">'+
			'<span class="glyphicon glyphicon-user"></span>&nbsp;&nbsp;' + _name + '</span>' +
			'<span class="msg-time label label-default pull-left">' +
            '<span class="glyphicon glyphicon-time"></span>&nbsp;&nbsp;' + _time + '</span>' +
            '</div><div class="msg-content">' + _content + '</div></div>'
		);
		this.chatBodyToBottom();
	},
	addServerMessage: function(_time, _content){
	    var msg_list = $(".msg-list-body");
		_content = QxEmotion.Parse(_content);
	    msg_list.append(
	            '<div class="clearfix msg-wrap"><div class="msg-head">' +
	            '<span class="msg-name label label-danger pull-left">' +
	            '<span class="glyphicon glyphicon-info-sign"></span>&nbsp;&nbsp;系统消息</span>' +
	            '<span class="msg-time label label-default pull-left">' +
	            '<span class="glyphicon glyphicon-time"></span>&nbsp;&nbsp;' + _time + '</span>' +
	            '</div><div class="msg-content">' + _content + '</div></div>'
	    );
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
			appUserToList(_user_list[i]);
		}
		this.updateListCount();
	},
	updateListCount: function(){
		var list_count = $('list-table').find('tr').length + 1;
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
		say(content);
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
			nickname_error.text();
			nickname_error.show();
			return;
		}

		if(name == $.cookie('chat_nickname')){
			nickname_error.text();
			nickname_error.show();
		}

		this.loginShow(name);
		Notify.request();
	},
	loginShow: function(){
		$('#login-modal').modal('show');
	},
	sendMsgKeydownEv:function(){
		var self = this;
		$('#input-edit').keydown(function(_event) {
		   if(13 == _event.keyCode) {
		       self.sendMessage();
		   }
		});
	},
	nameEditKeydownEv:function(){
		var self = this;
		$('#nickname-edit').keydown(function(_event) {
		    if(13 == _event.keyCode) {
		        self.applyNickname();
		    }
		});
	},
	dialogShowEv:function(){
		$("div[role='dialog']").on("show.bs.modal", function () {
		    // 具体css样式调整
		    $(this).css({
		        "display": "block",
		        "margin-top": function () {
		            return ($(this).height() / 3);
		        }
		    });
		});
	},
	loginModalShowEv:function(){
		$("#login-modal").on("show.bs.modal", function (_event) {
		    $('#nickname-edit').val("");
		    $("#nickname-error").hide();
		});
	},
	loginModalShownEv:function(){
		$("#login-modal").on("shown.bs.modal", function (_event) {
		    $('#nickname-edit').focus();
		});
	}
};


var chat_server = "http://" + location.hostname + ':3000';
var socket = io.connect(chat_server);

console.log('server:' + chat_server);

function changeNickname(_nickname){
	socket.emit('change_nickname', _nickname);
}

function say(_content){
	socket.emit('say', _content);
}

socket.on('need_nickname', function(){
	if(null == $.cookie('chat_nickname')){
		$('#login-modal').modal('show');
	}else{
		changeNickname($.cookie('chat_nickname'));
	}
});

socket.on('server_message', function(_message){
	addServerMessage(chat_Utils.getLocalHMS(), _message);
});

socket.on('change_nickname_error', function(_error_msg){
	$('#login-modal').modal('show');
	$("#nickname-error").text(_error_msg);
	$("#nickname-error").show();
	$('#nickname-edit').focus();
});

socket.on('change_nickname_done', function(_old_name, _new_nickname){
	$.cookie('chat_nickname', _new_nickname);
	$('#login-modal').modal('hide');
	$('#my-nickname').html('昵称：'+ _new_nickname);

	if(_old_name != null && _old_name != ''){
		addServerMessage();
	}

	updateListCount();
});

socket.on('say_done', function(_nick_name, _content){
	console.log('user_say(' + _nick_name + ', ' + _content + ')');
	addMessage(_nick_name, getLocalHMS(), _content);

	if('hidden' == document()){
		Notify.show({
			icon: '/img/qx_chat.png',
			title: '聊天室信息',
			message: _nick_name + ': ' + _content,
			autoclose: 3,
			onclick: function(){
				window.focus();
				if(undefined !== typeof this.colse){
					this.close();
				}else if(undefined !== typeof this.cancel){
					this.cancel();
				}
			}
		});
	}
});

socket.on('user_list', function(_list){
	useUserList(_list);
});

socket.on('user_change_nickname', function(_old_nick_name, _new_nick_name){
	removeListUser();
	addUserToList();
	addServerMessage();
});

socket.on('user_join', function(_nick_name){
	addUserToList();
	updateListCount();
	addServerMessage();
});

socket.on('user_quit', function(_nick_name){
	removeListUser();
	updateListCount();
	addServerMessage();
});

socket.on('user_say', function(_nick_name, _content){
	addMessage();
});




var logger = require('pomelo-logger').getLogger('pomelo-admin', 'MasterSocket');
var Constants = require('../util/constants');
var protocol = require('../util/protocol');

var MasterSocket = function() {
	this.id = null;
	this.type = null;
	this.info = null;
	this.agent = null;
	this.socket = null;
	this.username = null;
	this.registered = false;
}

MasterSocket.prototype.onRegister = function(msg) {
	if (!msg || !msg.type) {
		return;
	}

	var self = this;
	var msgId = msg.id;
	var msgType = msg.type;
	var socket = this.socket;

	if (msgType == Constants.TYPE_CLIENT) {
		// client connection not join the map
		this.id = msgId;
		this.type = msgType;
		this.info = 'client';
		this.agent.doAuthUser(msg, socket, function(err) {
			if (err) {
				return socket.disconnect();
			}

			self.username = msg.username;
			self.registered = true;
		});
		return;
	} // end of if(msgType === 'client')

	if (msgType == Constants.TYPE_MONITOR) {
		if (!msgId) {
			return;
		}

		// if is a normal server
		this.id = msgId;
		this.type = msg.serverType;
		this.info = msg.info;
		this.agent.doAuthServer(msg, socket, function(err) {
			if (err) {
				return socket.disconnect();
			}

			self.registered = true;
		});

		this.repushQosMessage(msgId);
		return;
	} // end of if(msgType === 'monitor') 

	this.agent.doSend(socket, 'register', {
		code: protocol.PRO_FAIL,
		msg: 'unknown auth master type'
	});

	socket.disconnect();
}

MasterSocket.prototype.onMonitor = function(msg) {
	var socket = this.socket;
	if (!this.registered) {
		// not register yet, ignore any message
		// kick connections
		socket.disconnect();
		return;
	}

	var self = this;
	var type = this.type;
	if (type === Constants.TYPE_CLIENT) {
		logger.error('invalid message from monitor, but current connect type is client.');
		return;
	}

	msg = protocol.parse(msg);
	var respId = msg.respId;
	if (respId) {
		// a response from monitor
		var cb = self.agent.callbacks[respId];
		if (!cb) {
			logger.warn('unknown resp id:' + respId);
			return;
		}

		var id = this.id;
		if (self.agent.msgMap[id]) {
			delete self.agent.msgMap[id][respId];
		}
		delete self.agent.callbacks[respId];
		return cb(msg.error, msg.body);
	}

	// a request or a notify from monitor
	self.agent.consoleService.execute(msg.moduleId, 'masterHandler', msg.body, function(err, res) {
		if (protocol.isRequest(msg)) {
			var resp = protocol.composeResponse(msg, err, res);
			if (resp) {
				self.agent.doSend(socket, 'monitor', resp);
			}
		} else {
			//notify should not have a callback
			logger.warn('notify should not have a callback.');
		}
	});
}

MasterSocket.prototype.onClient = function(msg) {
	var socket = this.socket;
	if (!this.registered) {
		// not register yet, ignore any message
		// kick connections
		return socket.disconnect();
	}

	var type = this.type;
	if (type !== Constants.TYPE_CLIENT) {
		logger.error('invalid message to client, but current connect type is ' + type);
		return;
	}

	msg = protocol.parse(msg);

	var msgCommand = msg.command;
	var msgModuleId = msg.moduleId;
	var msgBody = msg.body;

	var self = this;

	if (msgCommand) {
		// a command from client
		self.agent.consoleService.command(msgCommand, msgModuleId, msgBody, function(err, res) {
			if (protocol.isRequest(msg)) {
				var resp = protocol.composeResponse(msg, err, res);
				if (resp) {
					self.agent.doSend(socket, 'client', resp);
				}
			} else {
				//notify should not have a callback
				logger.warn('notify should not have a callback.');
			}
		});
	} else {
		// a request or a notify from client
		// and client should not have any response to master for master would not request anything from client
		self.agent.consoleService.execute(msgModuleId, 'clientHandler', msgBody, function(err, res) {
			if (protocol.isRequest(msg)) {
				var resp = protocol.composeResponse(msg, err, res);
				if (resp) {
					self.agent.doSend(socket, 'client', resp);
				}
			} else {
				//notify should not have a callback
				logger.warn('notify should not have a callback.');
			}
		});
	}
}

MasterSocket.prototype.onReconnect = function(msg, pid) {
	// reconnect a new connection
	if (!msg || !msg.type) {
		return;
	}

	var serverId = msg.id;
	if (!serverId) {
		return;
	}

	var socket = this.socket;

	// if is a normal server
	if (this.agent.idMap[serverId]) {
		// id has been registered
		this.agent.doSend(socket, 'reconnect_ok', {
			code: protocol.PRO_FAIL,
			msg: 'id has been registered. id:' + serverId
		});
		return;
	}

	var msgServerType = msg.serverType;
	var record = this.agent.addConnection(this.agent, serverId, msgServerType, msg.pid, msg.info, socket);

	this.id = serverId;
	this.type = msgServerType;
	this.registered = true;
	msg.info.pid = pid;
	this.info = msg.info;
	this.agent.doSend(socket, 'reconnect_ok', {
		code: protocol.PRO_OK,
		msg: 'ok'
	});

	this.agent.emit('reconnect', msg.info);

	this.repushQosMessage(serverId);
}

MasterSocket.prototype.onDisconnect = function() {
	var socket = this.socket;
	if (socket) {
		delete this.agent.sockets[socket.id];
	}

	var registered = this.registered;
	if (!registered) {
		return;
	}

	var id = this.id;
	var type = this.type;
	var info = this.info;
	var username = this.username;

	logger.info('disconnect %s %s %j', id, type, info);
	if (registered) {
		this.agent.removeConnection(this.agent, id, type, info);
		this.agent.emit('disconnect', id, type, info);
	}

	if (type === Constants.TYPE_CLIENT && registered) {
		logger.info('client user ' + username + ' exit');
	}

	this.registered = false;
	this.id = null;
	this.type = null;
}

MasterSocket.prototype.repushQosMessage = function(serverId) {
	var socket = this.socket;
	// repush qos message
	var qosMsgs = this.agent.msgMap[serverId];

	logger.info('repush qos message %j', qosMsgs);

	if (!qosMsgs) {
		return;
	}

	for (var reqId in qosMsgs) {
		var qosMsg = qosMsgs[reqId];
		var moduleId = qosMsg['moduleId'];
		var tmsg = qosMsg['msg'];

		this.agent.sendToMonitor(socket, reqId, moduleId, tmsg);
	}
}

module.exports = MasterSocket;
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var sio = require('socket.io');
var utils = require('./util/utils');
var protocol = require('./util/protocol');

var ST_INITED = 1;
var ST_STARTED = 2;
var ST_CLOSED = 3;

var MasterAgent = function(consoleService) {
	EventEmitter.call(this);
	this.consoleService = consoleService;
	this.server = null;
	this.idMap = {};
	this.typeMap = {};
	this.clients = {};
	this.reqId = 1;
	this.callbacks = {};
	this.state = ST_INITED;
};

util.inherits(MasterAgent, EventEmitter);

module.exports = MasterAgent;

var TYPE_CLIENT = 'client';

var pro = MasterAgent.prototype;

pro.listen = function(port) {
	if(this.state > ST_INITED) {
		console.error('master agent has started or closed.');
		return;
	}
	this.state = ST_STARTED;
	this.server = sio.listen(port);
	this.server.set('log level', 0);
	
	var self = this;
	this.server.server.on('error', function(err) {
		self.emit('error', err);
	});

	this.server.sockets.on('connection', function(socket) {
		var id, type, registered;

		socket.on('register', function(msg) {
			// register a new connection
			if(msg && msg.type) {
				if(msg.type === 'client') {
					// client connection not join the map
					if(!msg.id) {
						// client should has a client id
						return;
					}
					if(self.clients[msg.id]) {
						socket.emit('register', {code: protocol.PRO_FAIL, msg: 'id has been registered. id:' + msg.id});
						return;
					}
					addConnection(self, msg.id, msg.type, socket);
					id = msg.id;
					type = msg.type;
					registered = true;
					socket.emit('register', {code: protocol.PRO_OK, msg: 'ok'});
					return;
				}

				if(msg.id) {
					// if is a normal server
					if(self.idMap[msg.id]) {
						socket.emit('register', {code: protocol.PRO_FAIL, msg: 'id has been registered. id:' + msg.id});
						return;
					}
					var record = addConnection(self, msg.id, msg.type, socket);
					id = msg.id;
					type = msg.type;
					registered = true;
					socket.emit('register', {code: protocol.PRO_OK, msg: 'ok'});
					self.emit('register', record);
				}
			}
		});		// end of on 'register'

		// message from monitor
		socket.on('monitor', function(msg) {
			if(!registered) {
				// not register yet, ignore any message
				return;
			}

			if(type === TYPE_CLIENT) {
				console.error('invalid message to monitor, but current connect type is client.');
				return;
			}

			msg = protocol.parse(msg);
			if(msg.respId) {
				// a response from monitor
				var cb = self.callbacks[msg.respId];
				if(!cb) {
					console.warn('unknown resp id:' + msg.respId);
					return;
				}
				delete self.callbacks[msg.respId];
				utils.invokeCallback(cb, msg.error, msg.body);
				return;
			}

			// a request or a notify from monitor
			self.consoleService.execute(msg.moduleId, 'masterHandler', msg.body, function(err, res) {
				if(protocol.isRequest(msg)) {
					var resp = protocol.composeResponse(msg, err, res);
					if(resp) {
						socket.emit('monitor', resp);
					}
				} else {
					//notify should not have a callback
					console.error('notify should not have a callback.');
				}
			});
		});		// end of on 'monitor'

		// message from client
		socket.on('client', function(msg) {
			if(!registered) {
				// not register yet, ignore any message
				return;
			}
			if(type !== TYPE_CLIENT) {
				console.error('invalid message to client, but current connect type is ' + type);
				return;
			}
			msg = protocol.parse(msg);
			// a request or a notify from client 
			// and client should not have any response to master for master would not request anything from client
			self.consoleService.execute(msg.moduleId, 'clientHandler', msg.body, function(err, res) {
				if(protocol.isRequest(msg)) {
					var resp = protocol.composeResponse(msg, err, res);
					if(resp) {
						socket.emit('client', resp);
					}
				} else {
					//notify should not have a callback
					console.error('notify should not have a callback.');
				}
			});
		});		// end of on 'client'

		socket.on('disconnect', function() {
			removeConnection(self, id, type);
			self.emit('disconnect', id, type);
		});

		socket.on('error', function(err) {
			self.emit('error', id, type, err);
		});
	});		// end of on 'connection'
};		// end of listen

pro.close = function() {
	if(this.state > ST_STARTED) {
		return;
	}
	this.state = ST_CLOSED;
	this.server.server.close();
};

pro.set = function(moduleId, value) {
	this.consoleService.set(moduleId, value);
};

pro.get = function(moduleId) {
	return this.consoleService.get(moduleId);
};

pro.request = function(serverId, moduleId, msg, cb) {
	if(this.state > ST_STARTED) {
		return;
	}

	var record = this.idMap[serverId];
	if(!record) {
		utils.invokeCallback(cb, new Error('unknown server id:' + serverId));
		return;
	}
	var curId = this.reqId++;
	this.callbacks[curId] = cb;
	sendToMonitor(record.socket, curId, moduleId, msg);
};

pro.notifyById = function(serverId, moduleId, msg) {
	if(this.state > ST_STARTED) {
		return;
	}

	var record = this.idMap[serverId];
	if(!record) {
		console.error('fail to notifyById for unknown server id:' + serverId);
		return false;
	}
	sendToMonitor(record.socket, null, moduleId, msg);
	return true;
};

pro.notifyByType = function(type, moduleId, msg) {
	if(this.state > ST_STARTED) {
		return;
	}

	var list = this.typeMap[type];
	if(!list || list.length === 0) {
		console.error('fail to notifyByType for unknown server type:' + type);
		return false;
	}
	broadcastMonitors(list, moduleId, msg);
	return true;
};

pro.notifyAll = function(moduleId, msg) {
	if(this.state > ST_STARTED) {
		return;
	}
	broadcastMonitors(this.idMap, moduleId, msg);
	return true;
};

pro.notifyClient = function(clientId, moduleId, msg) {
	if(this.state > ST_STARTED) {
		return;
	}

	var record = this.clients[clientId];
	if(!record) {
		console.error('fail to notifyClient for unknown client id:' + clientId);
		return false;
	}
	sendToClient(record.socket, null, moduleId, msg);
};

var addConnection = function(agent, id, type, socket) {
	var record = {
		id: id, 
		type: type, 
		socket: socket
	};
	if(type === 'client') {
		agent.clients[id] = record;
	} else {
		agent.idMap[id] = record;
		var list = agent.typeMap[type] = agent.typeMap[type] || [];
		list.push(record);
	}
	return record;
};

var removeConnection = function(agent, id, type) {
	if(type === 'client') {
		delete agent.clients[id];
	} else {
		delete agent.idMap[id];
		var list = agent.typeMap[type];
		if(list) {
			for(var i=0, l=list.length; i<l; i++) {
				if(list[i].id === id) {
					list.slice(i, 1);
					break;
				}
			}
			if(list.length === 0) {
				delete agent.typeMap[type];
			}
		}
	}
};

var sendToMonitor = function(socket, reqId, moduleId, msg) {
	socket.emit('monitor', protocol.composeRequest(reqId, moduleId, msg));
};

var sendToClient = function(socket, reqId, moduleId, msg) {
	socket.emit('client', protocol.composeRequest(reqId, moduleId, msg));
};

var broadcastMonitors = function(records, moduleId, msg) {
	msg = protocol.composeRequest(null, moduleId, msg);

	if(records instanceof Array) {
		for(var i=0, l=records.length; i<l; i++) {
			records[i].socket.emit('monitor', msg);
		}
	} else {
		for(var id in records) {
			records[id].socket.emit('monitor', msg);
		}
	}
};

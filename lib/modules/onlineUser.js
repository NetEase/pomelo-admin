/*!
 * Pomelo -- consoleModule onlineUser 
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var monitor = require('pomelo-monitor');
var logger = require('../util/log/log').getLogger(__filename);
var utils = require('../util/utils');

var Module = function(app, opts) {
	opts = opts || {};
	this.app = app;
	this.type = opts.type || 'pull';
	this.interval = opts.interval || 5;
};

Module.moduleId = 'onlineUser';

module.exports = Module;

var pro = Module.prototype;

pro.monitorHandler = function(agent, msg) {
	var connectionService = this.app.components.connection;
	if(!connectionService) {
		logger.error('not support connection: %j', agent.id);
		return;
	}

	agent.notify(Module.moduleId, connectionService.getStatisticsInfo());
};

pro.masterHandler = function(agent, msg) {
	if(!msg) {
		// pull interval callback
		agent.notifyByType('connector', Module.moduleId);
		return;
	}

	var data = agent.get(Module.moduleId);
	if(!data) {
		data = {};
		agent.set(Module.moduleId, data);
	}

	data[msg.serverId] = msg;
};

pro.clientHandler = function(agent, msg, cb) {
	utils.invokeCallback(cb, null, agent.get(Module.moduleId));
	/*
	utils.invokeCallback(cb, null, {
		totalConnCount: (this.consoleService.get("totalConnCount")||0), 
		loginedCount:(this.consoleService.get("loginedCount")||0), 
		onlineUserList:(this.consoleService.get("onlineUserList")||{})
	});*/
};

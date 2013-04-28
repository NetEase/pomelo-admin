/*!
 * Pomelo -- consoleModule moduleHandle
 * Copyright(c) 2013 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var logger = require('pomelo-logger').getLogger(__filename);

module.exports = function(opts) {
	return new Module(opts);
};

module.exports.moduleId = "moduleHandle";

var Module = function(opt) {
	this.app = opt.app;
	this.commands = {
		'list': list,
		'enable': enable,
		'disable': disable
	};
};

Module.prototype.monitorHandler = function(agent, msg, cb) {
	var moduleId = msg.moduleId;
	if (!moduleId) {
		logger.error('fail to enable admin module for ' + moduleId);
		cb('empty moduleId');
		return;
	}
	var consoleService = agent.consoleService;

	if (msg.command === 'disable') {
		consoleService.disable(moduleId);
		return;
	}

	if (msg.command === 'enable') {
		consoleService.enable(moduleId);
		return;
	}
};

Module.prototype.clientHandler = function(agent, msg, cb) {
	var fun = this.commands[msg.command];
	if (!fun || typeof fun !== 'function') {
		cb('unknown command:' + msg.command);
		return;
	}
	fun(this.app, agent, msg, cb);
};

/**
 * List current modules
 */
var list = function(app, agent, msg, cb) {
	var consoleService = agent.consoleService;
	var modules = {};
	if (consoleService) {
		modules = consoleService.modules;
	}

	var result = [];
	for (var moduleId in modules) {
		if (/^__\w+__$/.test(moduleId)) {
			continue;
		}

		result.push(moduleId);
	}

	cb(null, {
		modules: result
	});
};

/**
 * enable module in current server
 */
var enable = function(app, agent, msg, cb) {
	var moduleId = msg.moduleId;
	if (!moduleId) {
		logger.error('fail to enable admin module for ' + moduleId);
		cb('empty moduleId');
		return;
	}

	var consoleService = agent.consoleService;
	var _module = consoleService.modules[moduleId]['module'];

	if (_module['type'] === 'pull') {
		consoleService.enable(moduleId);
		return;
	}

	if (_module['type'] === 'push') {
		agent.notifyAll(module.exports.moduleId, msg);
	}
};

/**
 * disable module in current server
 */
var disable = function(app, agent, msg, cb) {
	var moduleId = msg.moduleId;
	if (!moduleId) {
		logger.error('fail to enable admin module for ' + moduleId);
		cb('empty moduleId');
		return;
	}

	var consoleService = agent.consoleService;
	var _module = consoleService.modules[moduleId]['module'];
	
	if (_module['type'] === 'pull') {
		consoleService.disable(moduleId);
		return;
	}

	if (_module['type'] === 'push') {
		agent.notifyAll(module.exports.moduleId, msg);
	}
};
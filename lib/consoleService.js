var utils = require('./util/utils');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var MasterAgent = require('./masterAgent');
var MonitorAgent = require('./monitorAgent');
var schedule = require('pomelo-schedule');

/**
 * ConsoleService Constructor
 * 
 * @param {Object} opts construct parameter
 *                      opts.type {String} server type, 'master', 'connector', etc.
 *                      opts.id {String} server id
 *                      opts.host {String} (monitor only) master server host
 *                      opts.port {String | Number} listen port for master or master port for monitor
 *                      opts.master {Boolean} current service is master or monitor
 */
var ConsoleService = function(opts) {
	EventEmitter.call(this);
	this.port = opts.port;
	this.values = {};
	this.master = opts.master;

	this.modules = {};

	if(this.master) {
		this.agent = new MasterAgent(this);
	} else {
		this.type = opts.type;
		this.id = opts.id;
		this.host = opts.host;
		this.agent = new MonitorAgent({
			consoleService: this, 
			id: this.id, 
			type: this.type
		});
	}
};

util.inherits(ConsoleService, EventEmitter);

var pro = ConsoleService.prototype;

pro.start = function(cb) {
	if(this.master) {
		this.agent.listen(this.port);
		exportEvent(this, this.agent, 'register');
		exportEvent(this, this.agent, 'disconnect');
		process.nextTick(function() {
			utils.invokeCallback(cb);
		});
	} else {
		console.info('try to connect master: %j, %j, %j', this.type, this.host, this.port);
		this.agent.connect(this.port, this.host, cb);
		exportEvent(this, this.agent, 'close');
	}

	exportEvent(this, this.agent, 'error');

	for(var mid in this.modules) {
		this.enable(mid);
	}
};

pro.stop = function() {
	for(var mid in this.modules) {
		this.disable(mid);
	}
	this.agent.close();
};

pro.register = function(moduleId, module) {
	this.modules[moduleId] = registerRecord(this, moduleId, module);
};

pro.enable = function(moduleId) {
	var record = this.modules[moduleId];
	if(record && !record.enable) {
		record.enable = true;
		addToSchedule(this, record);
		return true;
	}
	return false;
};

pro.disable = function(moduleId) {
	var record = this.modules[moduleId];
	if(record && record.enable) {
		record.enable = false;
		if(record.schedule && record.jobId) {
			schedule.cancelJob(record.jobId);
			schedule.jobId = null;
		}
		return true;
	}
	return false;
};

pro.execute = function(moduleId, method, msg, cb) {
	var m = this.modules[moduleId];
	if(!m) {
		console.error('unknown module: %j.', moduleId);
		console.error('msg: %j', msg);
		console.trace();
		cb('unknown moduleId:' + moduleId);
		return;
	}

	if(!m.enable) {
		console.error('module %j is disable.', moduleId);
		cb('module ' + moduleId + ' is disable');
		return;
	}

	var module = m.module;
	if(!module || typeof module[method] !== 'function') {
		console.error('module %j dose not have a method called %j.', moduleId, method);
		cb('module ' + moduleId + ' dose not have a method called ' + method);
		return;
	}

	module[method](this.agent, msg, cb);
};

/**
 * 设置状态信息
 */

pro.set = function(moduleId,value) {
	this.values[moduleId] = value;
};

/**
 * 获取状态信息
 */
pro.get = function(moduleId) {
	return this.values[moduleId];
};

var registerRecord = function(service, moduleId, module) {
	var record = {
		moduleId: moduleId, 
		module: module, 
		enable: false
	};

	if(module.type && module.interval) {
		if(!service.master && record.module.type === 'push' ||
			service.master && record.module.type !== 'push') {
			// push for monitor or pull for master(default)
			record.delay = module.delay || 0;
			record.interval = module.interval || 1;
			// normalize the arguments
			if(record.delay < 0) {
				record.delay = 0;
			}
			if(record.interval < 0) {
				record.interval = 1;
			}
			record.interval = Math.ceil(record.interval);
			record.delay *= 1000;
			record.interval *= 1000;
			record.schedule = true;
		}
	}

	return record;
};

var addToSchedule = function(service, record) {
	if(record && record.schedule) {
		record.jobId = schedule.scheduleJob(
			{start: Date.now() + record.delay, period: record.interval}, 
			doScheduleJob, {service: service, record: record}
		);
	}
};

var doScheduleJob = function(args) {
	var service = args.service;
	var record = args.record;
	if(!service || !record || !record.module || !record.enable) {
		return;
	}

	if(service.master) {
		record.module.masterHandler(service.agent, null, function(err) {
			console.error('interval push should not have a callback.');
		});
	} else {
		record.module.monitorHandler(service.agent, null, function(err) {
			console.error('interval push should not have a callback.');
		});
	}
};

var exportEvent = function(outer, inner, event) {
	inner.on(event, function() {
		var args = Array.prototype.slice.call(arguments, 0);
		args.unshift(event);
		outer.emit.apply(outer, args);
	});
};

/**
 * Create master ConsoleService
 * 
 * @param {Object} opts construct parameter
 *                      opts.port {String | Number} listen port for master console
 */
module.exports.createMasterConsole = function(opts) {
	opts = opts || {};
	opts.master = true;
	return new ConsoleService(opts);
};

/**
 * Create monitor ConsoleService
 * 
 * @param {Object} opts construct parameter
 *                      opts.type {String} server type, 'master', 'connector', etc.
 *                      opts.id {String} server id
 *                      opts.host {String} master server host
 *                      opts.port {String | Number} master port
 */
module.exports.createMonitorConsole = function(opts) {
	return new ConsoleService(opts);
};
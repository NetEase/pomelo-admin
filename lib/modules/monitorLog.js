/*!
 * Pomelo -- consoleModule monitorLog
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var monitor = require('pomelo-monitor');
//var logger = require('../util/log/log').getLogger(__filename);
var logger = require('log4js').getLogger('monitorLog');
var ml = require('../util/monitorLog');
var serverUtil = require('../util/serverUtil');
var utils = require('../util/utils');

/**
 * Initialize a new 'Module' with the given 'opts'
 *
 * @class Module
 * @constructor
 * @param {object} opts
 * @api public
 */
var Module = function(opts) {
	opts = opts || {};
	this.type = opts.type || 'pull';
	this.interval = opts.interval || 5;
};

module.exports = Module;
Module.moduleId = 'monitorLog';
 
 /**
 * collect monitor data from monitor 
 *
 * @param {Object} agent monitorAgent object 
 * @param {Object} msg client message 
 * @param {Function} cb callback function
 * @api public
 */
Module.prototype.monitorHandler = function(agent,msg, cb) {
	//collect data
	var self = this;
	var serverId = agent.id;
	//logger.info(msg);
	ml.getLogs(msg, function (data) {
		//logger.info(data);
		//agent.notify(Module.moduleId, {serverId: agent.id, body: data});
		utils.invokeCallback(cb,null,{serverId:serverId,body:data})
    });
};

/**
 * handle monitor request data 
 *
 * @param {Object} agent masterAgent object 
 * @param {Object} msg monitor message 
 * @param {Function} cb callback function
 * @api public
 */
Module.prototype.masterHandler = function(agent,msg, cb) {

	var datas=msg.dataArray;
    var logfile=msg.logfile;
    var serverId = agent.id;
    
    if(!msg) {
		agent.notifyAll(Module.moduleId);
		return;
	}

	var body=msg.body; 
	var data = agent.get(Module.moduleId);
	if(!data) {
		data = {};
		agent.set(Module.moduleId, data);
	}

	data[msg.serverId] = body;
	/*
    for(var i=0;i<datas.length;i++){
    	this.consoleService.set(logfile,datas[i],datas[i].serverId);
    }

	if(msg&&msg.reqId){
		utils.invokeCallback(cb,null,body);
	}
	*/
};

/**
 * handle client request 
 *
 * @param {Object} agent masterAgent object 
 * @param {Object} msg client message 
 * @param {Function} cb callback function
 * @api public
 */
Module.prototype.clientHandler = function(agent,msg, cb) {
	agent.request(msg.serverId, Module.moduleId, msg, function(err, res) {
        if(err) {
            logger.error('fail to run log for ' + err.stack);
            return;
        }
        cb(null, res);
    });
	//utils.invokeCallback(cb, null, agent.get(Module.moduleId) || {});
};

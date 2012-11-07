/*!
 * Pomelo -- consoleModule monitorLog
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var logger = require('pomelo-logger').getLogger(__filename);
var logUtil = require('../util/logUtil');

module.exports = function(opts) {
	return new Module(opts);
};

module.exports.moduleId = 'monitorLog';

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
	this.interval = opts.interval || 5;
};

 /**
 * collect monitor data from monitor 
 *
 * @param {Object} agent monitorAgent object 
 * @param {Object} msg client message 
 * @param {Function} cb callback function
 * @api public
 */
Module.prototype.monitorHandler = function(agent, msg, cb) {
	//collect data
	var serverId = agent.id;
	logUtil.getLogs(msg, function (data) {
		cb(null, {serverId: serverId, body: data});
    });
};

/**
 * handle client request 
 *
 * @param {Object} agent masterAgent object 
 * @param {Object} msg client message 
 * @param {Function} cb callback function
 * @api public
 */
Module.prototype.clientHandler = function(agent, msg, cb) {
	agent.request(msg.serverId, module.exports.moduleId, msg, function(err, res) {
        if(err) {
            logger.error('fail to run log for ' + err.stack);
            return;
        }
        cb(null, res);
    });
};

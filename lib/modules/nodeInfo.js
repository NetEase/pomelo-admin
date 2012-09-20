/*!
 * Pomelo -- consoleModule nodeInfo processInfo
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var monitor = require('pomelo-monitor');
var logger = require('../util/log/log').getLogger(__filename);
var utils = require('../util/utils');

var nodeInfo = function(consoleService) {
	this.consoleService = consoleService;
};

module.exports = nodeInfo;
var moduleId = "nodeInfo";

var pro = nodeInfo.prototype;
 
pro.monitorHandler = function(agent,msg, cb) {
	//collect data
	var self = this;
	var serverId = self.consoleService.id;
	var pid = process.pid;
	var params = {
		serverId: serverId,
		pid: pid
	};
    monitor.psmonitor.getPsInfo(params, function (data) {
        utils.invokeCallback(cb,null,{serverId:serverId,body:data});
    });

};

pro.masterHandler = function(agent,msg, cb) {
	var body=msg.body;
	this.consoleService.set(moduleId,body,msg.serverId);
	if(msg&&msg.reqId){
		utils.invokeCallback(cb,null,body);
	}
};

pro.clientHandler = function(agent,msg, cb) {

	if(msg.monitorId != 'all'){
		// request from client get data from monitor
		agent.request(msg.monitorId,moduleId,msg,function(err,resp){
			utils.invokeCallback(cb,err,resp);
		});
	}else{
		utils.invokeCallback(cb,null,this.consoleService.get(moduleId) || {});
	}
};

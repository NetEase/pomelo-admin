/*!
 * Pomelo -- consoleModule monitorLog
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var monitor = require('pomelo-monitor');
var logger = require('../util/log/log').getLogger(__filename);
var ml = require('../util/monitorLog');
var serverUtil = require('../util/serverUtil');
var utils = require('../util/utils');

var monitorLog = function(consoleService) {
	this.consoleService = consoleService;
};

module.exports = monitorLog;
var moduleId = "monitorLog";

var pro = monitorLog.prototype;
 
pro.monitorHandler = function(agent,msg, cb) {
	//collect data
	var self = this;
	var serverId = self.consoleService.id;
	ml.getLogs(msg, function (data) {
		utils.invokeCallback(cb,null,{serverId:serverId,body:data})
    });
};

pro.masterHandler = function(agent,msg, cb) {

	var datas=msg.dataArray;
    var logfile=msg.logfile;
    var serverId = self.consoleService.id;
    
    for(var i=0;i<datas.length;i++){
    	this.consoleService.set(logfile,datas[i],datas[i].serverId);
    }

	if(msg&&msg.reqId){
		utils.invokeCallback(cb,null,body);
	}
};

pro.clientHandler = function(agent,msg, cb) {
	var logs = [];
	var logfile=msg.logfile;
	if(msg.monitorId != 'all'){
		// request from client get data from monitor
		agent.request(msg.monitorId,moduleId,msg,function(err,resp){
			utils.invokeCallback(cb,err,resp);
		});
	}else{
		var files = this.consoleService.get(logfile) || {};
		for(var serverId in files){
	    	logs.push(files[serverId]);
	    }
	    var countData = serverUtil.getCountData(logs);
		cb(null,{data:this.consoleService.get(msg.logfile),countData:countData});
	}
};

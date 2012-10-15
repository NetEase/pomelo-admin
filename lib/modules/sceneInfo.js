/*!
 * Pomelo -- consoleModule sceneInfo
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var monitor = require('pomelo-monitor');
var logger = require('../util/log/log').getLogger(__filename);
var utils = require('../util/utils');

var Module = function(opts) {
	opts = opts || {};
	this.type = opts.type || 'pull';
	this.interval = opts.interval || 5;
};

module.exports = Module;
Module.moduleId = 'sceneInfo';

var pro = Module.prototype;
 
pro.monitorHandler = function(agent, msg, cb) {
	//collect data
	var self = this;
	var serverId = agent.id;
	var path = process.cwd() + '/app/domain/area/area';
	var area = require(path);
	var data = area.getAllPlayers();
	//logger.info(data);
	//monitorAgent.socket.emit('monitorScene', area.getAllPlayers());
	agent.notify(Module.moduleId, {serverId: serverId, body: data});
	//utils.invokeCallback(cb,null,{serverId:serverId,body:area.getAllPlayers()});
};

pro.masterHandler = function(agent, msg, cb) {
	if(!msg) {
		// pull interval callback
		agent.notifyByType('area', Module.moduleId);
		return;
	}

	var data = agent.get(Module.moduleId);
	if(!data) {
		data = {};
		agent.set(Module.moduleId, data);
	}
	//logger.info(msg);
	data[msg.serverId] = msg.body;
	/*
	var length=0;
    if(msg){length=msg.length;}
    if(length>0){
        for(var i=0;i<length;i++){
            msg[i].position='('+msg[i].x+','+msg[i].y+')';
            this.consoleService.set(monitorId,msg[i],msg.serverId);
        }
        //self.io.sockets.in('web_clients').emit('getSenceInfo',{data:sceneInfos});
    }
	if(msg&&msg.reqId){
		utils.invokeCallback(cb,null,body);
	}
	*/
};

pro.clientHandler = function(agent, msg, cb) {
	utils.invokeCallback(cb, null, agent.get(Module.moduleId));
	/*
	if(msg.monitorId !='all'){
		// request from client get data from monitor
		agent.request(msg.monitorId,moduleId,msg,function(err,resp){
			utils.invokeCallback(cb,err,resp);
		});
	}else{
		utils.invokeCallback(cb,null,this.consoleService.get(moduleId));
	}
	*/
};

/*!
 * Pomelo -- consoleModule sceneInfo
 * Copyright(c) 2012 fantasyni <fantasyni@163.com>
 * MIT Licensed
 */
var monitor = require('pomelo-monitor');
var logger = require('../util/log/log').getLogger(__filename);
var utils = require('../util/utils');

var sceneInfo = function(consoleService) {
	this.consoleService = consoleService;
};

module.exports = sceneInfo;
var moduleId = "sceneInfo";

var pro = sceneInfo.prototype;
 
pro.monitorHandler = function(agent,msg, cb) {
	//collect data
	var self = this;
	var serverId = self.consoleService.id;
	var area = require('../../../../app/domain/area/area');
	//monitorAgent.socket.emit('monitorScene', area.getAllPlayers());
	utils.invokeCallback(cb,null,{serverId:serverId,body:area.getAllPlayers()});
};

pro.masterHandler = function(agent,msg, cb) {

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
};

pro.clientHandler = function(agent,msg, cb) {
	if(msg.monitorId !='all'){
		// request from client get data from monitor
		agent.request(msg.monitorId,moduleId,msg,function(err,resp){
			utils.invokeCallback(cb,err,resp);
		});
	}else{
		utils.invokeCallback(cb,null,this.consoleService.get(moduleId));
	}
};

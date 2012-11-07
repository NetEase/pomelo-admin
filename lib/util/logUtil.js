var exec = require('child_process').exec;
var logger = require('pomelo-logger').getLogger(__filename);

var MonitorLog=module.exports;

//get the latest logs 
MonitorLog.getLogs = function(opts,callback) {
	var msg = opts.msg;
	var path = opts.path;
	var number = msg.number;
	var logfile = msg.logfile;
	var serverId = msg.serverId;
	var filePath;

	if(logfile === "con-log") {
		filePath = path + '/logs/con-log-' + serverId + '.log';	//the logfile   
	}else if(logfile === "rpc-log") {
		filePath = path + '/logs/rpc-log-' + serverId + '.log';	//the logfile   
	}else if(logfile === "for-log") {
		filePath = path + '/logs/forward-log-' + serverId + '.log';	//the logfile  
	}

	var endLogs = [];
	exec('tail -n ' + number + ' ' + filePath,function(error,output) {
		var endOut = [];
		output = output.replace(/^\s+|\s+$/g,"").split(/\s+/);

		for(var i=5; i<output.length; i+=6) {
			endOut.push(output[i]);
		}

		var endLength=endOut.length;
		for(var j=0; j<endLength; j++) {
			var map = {};
			var json;
			try{
				json = JSON.parse(endOut[j]);
			} catch(e) {
				logger.error('the log cannot parsed to json, '+e);
				continue;
			}
			map.time = json.time;
			map.route = json.route || json.service;
			map.serverId = serverId;
			map.timeUsed = json.timeUsed;
			map.params = endOut[j];
			endLogs.push(map);
		}

		callback({logfile:logfile,dataArray:endLogs}); 
	});
};



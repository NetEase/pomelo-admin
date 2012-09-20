var Master = require('../lib/masterAgent');
var Monitor = require('../lib/monitorAgent');
var ConsoleService = require('../lib/consoleService');
var systemInfo = require('../lib/modules/systemInfo');
var nodeInfo = require('../lib/modules/nodeInfo');
var onlineUser = require('../lib/modules/onlineUser');

var util = require('util');

var masterHost = '127.0.0.1';
var masterPort = 3005;

var masterConsole = new ConsoleService({
	type : "master",
	port : masterPort
});

masterConsole.register("systemInfo",new systemInfo(masterConsole));
masterConsole.register("nodeInfo",new nodeInfo(masterConsole));
masterConsole.register("onlineUser",new onlineUser(masterConsole));

masterConsole.start();
//console.log(masterConsole);
console.log("master listen on port: "+masterPort);
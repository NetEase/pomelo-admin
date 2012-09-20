var Master = require('../lib/masterAgent');
var Monitor = require('../lib/monitorAgent');
var ConsoleService = require('../lib/consoleService');
var systemInfo = require('../lib/modules/systemInfo');
var nodeInfo = require('../lib/modules/nodeInfo');
var onlineUser = require('../lib/modules/onlineUser');

var masterHost = '127.0.0.1';
var masterPort = 3005;
var monitorId = 'connector-server-1';

var monitorConsole = new ConsoleService({
	host : masterHost ,
	port : masterPort ,
	id : monitorId ,
	type : "monitor"
});

monitorConsole.register("systemInfo",new systemInfo(monitorConsole));
monitorConsole.register("nodeInfo",new nodeInfo(monitorConsole));
monitorConsole.register("onlineUser",new onlineUser(monitorConsole));

monitorConsole.start();
console.log(monitorId+" listen on port: "+masterPort);
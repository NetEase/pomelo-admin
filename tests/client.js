 var io = require('socket.io-client');
 var protocol = require('../lib/util/protocol');

 var socket = io.connect("http://localhost:801");
 console.log("client listen on master on port 801");

 socket.on('connect',function(){
 	socket.emit('register',{type:"client"});
 	//client request from monitor
 	var req = protocol.composeRequest("ad2jfa=x","nodeInfo",{moduleId:"nodeInfo",monitorId:"connector-server-1"})
 	//client request from master
 	//var req = protocol.composeRequest("ad2jfa=x","systemInfo",{moduleId:"systemInfo",monitorId:'all'})
	socket.emit('client',req);
 });

 socket.on('client',function(msg){
 	console.log(msg);
 });
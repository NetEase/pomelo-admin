#pomelo-admin

`pomelo-admin` is an admin console library for [pomelo](https://github.com/NetEase/pomelo). It provides the a series of utilities to monitor the `pomelo` server clusters.

##Installation

```
npm install pomelo-admin
```

##Basic conception

###Process roles

There are three process roles in `pomelo-admin`: master, monitor and client.

+ master - the master server process, collects and maintains all the client and monitor status and exports the cluster status for the clients.  

+ monitor - monitor proxy, in every server process which needs to be monitored. It should be started during the process starts and registers itself to the master server and reports the monitored process status to the master. 

+ client - `pomelo-admin` client process that fetches the status from master server, such as [pomelo-admin-web](https://github.com/NetEase/pomelo-admin-web).

###Message types

There are two message types of the communication between processes.

+ request - bidirectional message that cooperated with response.

+ notify - unidirectional message.

##Components

###ConsoleService 

Main service of `pomelo-admin` that runs in both master and monitor processes. It maintains the master agent or monitor agent for the process, loads the registed modules and provides the messages routing service for the messages from other processes.

###MasterAgent  

`pomelo-admin` agent that runs on the master process to provide the basic network communication and protocol encoding and decoding.

###MonitorAgent  

`pomelo-admin` agent that runs on the monitor process to provide the basic network communication and protocol encoding and decoding. 

###Module  
 
Module is the place to implement the monitor logic, such as process status collecting. Developer can register modules in `pomelo-admin` to customize all kinds of system monitors.

There are three optional callback functions in each module.

* function masterHandler(agent, msg, cb) - callback in master process to process a message from monitor process or a timer event in master process.

* function monitorHandler(agent, msg, cb) - callback in monitor process to process a message from master process or a timer event in monitor process.

* function clientHandler(agent, msg, cb) - callback in master process to process a message from client.

The relations of the components is as below:

<center>
![pomelo-admin-arch](http://pomelo.netease.com/resource/documentImage/pomelo-admin-arch.png)
</center>

##Usage

```javascript
var admin = require("pomelo-admin");
```

Create a consoleService instance in master process.

```javascript
var masterConsole = admin.createMasterConsole({  
    port: masterPort  
});  
```

Register an admin module.

```javascript
masterConsole.register(moduleId, module);  
```

Start masterConsole.

```javascript
masterConsole.start(function(err) {  
  // start servers  
});  
```

Create a consoleService instance in monitor process. 

```javascript
var monitorConsole = admin.createMonitorConsole({  
    id: serverId,  
    type: serverType,  
    host: masterInfo.host,  
    port: masterInfo.port,  
    info: serverInfo  
}); 
```

##Customized modules  

Developers can customize modules to collect and export additional status as they need.

###Simple example  

```javascript
var Module = function(app, opts) {
  opts = opts || {};
  this.type = opts.type || 'pull';  // pull or push 
  this.interval = opts.interval || 5; // pull or push interval
};

Module.moduleId = 'helloPomelo';

module.exports = Module;

Module.prototype.monitorHandler = function(agent, msg) {
  var word = agent.id + ' hello pomelo';
  // notify admin messages to master
  agent.notify(Module.moduleId, {serverId: agent.id, body: word});
};

Module.prototype.masterHandler = function(agent, msg) {
  // if no message, then notify all monitors to fetch datas
  if(!msg) {
    agent.notifyAll(Module.moduleId);
    return;
  }
  // collect data from monitor
  var data = agent.get(Module.moduleId);
  if(!data) {
    data = {};
    agent.set(Module.moduleId, data);
  }

  data[msg.serverId] = msg;
};

Module.prototype.clientHandler = function(agent, msg, cb) {
  // deal with client request,directly return data cached in master
  cb(null, agent.get(Module.moduleId) || {});
};
```

###Register customized modules

you must register your customized modules to pomelo to make it work.  
write in app.js which is in your project's root directory  

```javascript
app.configure('production|development', function() {
  app.registerAdmin('helloPomelo',new helloPomelo());
});
```

###Notes  

`pomelo-admin` provides a series of useful system modules by default. But most of them are turned off by default. Add a simple line of code in `app.js` as below to enable them.

```javascript
app.configure('development', function() {
  // enable the system monitor modules
  app.enable('systemMonitor');
});
```

# pomelo-admin
pomelo-admin is an admin console library for [pomelo](https://github.com/NetEase/pomelo). it registers admin modules and you can monitor your server cluster .  
##Installation
```
npm install pomelo-admin
```
##Roles in pomelo-admin : master,monitor,client
+ master: master server , listen on port and wait for clients and monitors to connect. it maintains all the registered connections,message routes,and cache server clusters' states  
+ monitor: any server which needs to be monitored (include master server). it collects moniotered messages and push or pull to the master server  
+ client: any client which wants to get admin states from server cluster  


###Message types among roles : request and notify
+ request: messages sended with callback
+ notify: messages sended without callback

###ConsoleService  
it is the entry path for admin modules,master and monitor server both need to create a consoleService. every monitored server registeres its module to consoleService.consoleService creates base agents based on server type instance and is responsible for agents' lifecycle  
###masterAgent  
run on the master server and is responsible for base network communications  
###monitorAgent  
run on the monitor server , connect to the masterAgent and collects monitor states  
###module  
admin monitor module,implements admin logic,defines three callback interfaces, which corresponds to the logic of master,monitor and client  

####Usage  
```
var admin = require("pomelo-admin");
```

on master server create masterConsole  
```
var masterConsole = admin.createMasterConsole({  
    port: masterPort  
});  
```

register admin modules in master  
```
masterConsole.register(moduleId, module);  
```

start masterConsole and registered modules  
```
masterConsole.start(function(err) {  
  // start servers  
});  
```

on monitor server create monitorConsole  
```
var monitorConsole = admin.createMonitorConsole({  
    id: serverId,  
    type: serverType,  
    host: masterInfo.host,  
    port: masterInfo.port,  
    info: serverInfo  
}); 
```
 
register admin modules in monitor  
```
monitorConsole.register(moduleId, module);   
```
 
start monitorConsole and registered modules  
```
monitorConsole.start(function(err) {  
  // start modules  
});  
```

##Customized modules  
you can define your user-defined modules for your specific needs.  

###Simple module example  
```
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

###Register your modules
you must register your customized modules to pomelo to make it work.  
write in app.js which is in your project's root directory  

```
app.configure('production|development', function() {
  app.registerAdmin('helloPomelo',new helloPomelo());
});
```

###Notes  
+ pomelo-admin has supplied some useful system modules to monitor your server clusters,to use it , you just need to enable it in your projects.  
write in app.js which is in your project's root directory  

```
app.configure('development', function() {
  // enable the system monitor modules
  app.enable('systemMonitor');
});
```
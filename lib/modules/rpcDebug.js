var MongoClient = require('../util/mongoUtil');
var logger = require('pomelo-logger').getLogger('pomelo-admin', __filename);
var fs = require('fs');

module.exports = function() {
	return new Module();
};

module.exports.moduleId = 'rpcDebug';

var Module = function() {
	this.opts = null;
};

Module.prototype.clientHandler = function(agent, msg, cb) {
	var self = this;
	if (!self.opts) {
		var p = process.cwd() + '/config/mongo.json';
		if (fs.existsSync(p)) {
			var data = require(p);
			self.opts = data;
		} else {
			var e = 'fail to read mongo config file : ' + p;
			logger.error(e);
			cb(e);
			return;
		}
	}

	MongoClient(self.opts, function(err, mongoClient){
		if(err) {
			return;
		}
		mongoClient.findToArray(msg.limit, function(err, objs) {
			cb(err, objs);
		});
	});
};
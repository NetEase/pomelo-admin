var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
var logger = require('pomelo-logger').getLogger('pomelo-admin', __filename);

var instance = null;
var MongoDB = function(opt) {
	this.host = opt['host'] || 'localhost';
	this.port = opt['port'] || 27017;
	this.username = opt['username'];
	this.password = opt['password'];
	this.database = opt['database'];
	this.collection = opt['collection'];
	this.db = null;
};

module.exports = function(opt, cb) {
	if(!instance) {
		instance = new MongoDB(opt);
	}
	
	if(instance.db) {
		cb(null, instance);
	} else {
		instance.init(function(err){
			if (err) {
				var e = 'fail to connet to mongo ' + err;
				logger.error(e);
				cb(err);
			}
			cb(null, instance);
		});
	}
};

MongoDB.prototype.init = function(cb) {
	var self = this;
	var url = "";
	if(this.username) {
		url = format("mongodb://%s:%s@%s:%s/%s", this.username, this.password, this.host, this.port, this.database);
	} else {
		url = format("mongodb://%s:%s/%s", this.host, this.port, this.database);
	}

	MongoClient.connect(url, function(err, db) {
		if (err) {
			cb(err);
			return;
		}
		logger.info('connect to mongodb %j %j', self.host, self.port);
		self.db = db;
		cb(null);
	});
};

MongoDB.prototype.insert = function(msg, cb) {
	var self = this;
	this.db.collection(self.collection).insert(msg, function(err, objects) {
		if ( !! err) {
			cb(new Error('mongodb insert message error: %j', msg));
			return;
		}
		cb(err, objects);
	});
};

MongoDB.prototype.findToArray = function(limit, cb) {
	var self = this;
	this.db.collection(self.collection).find({}, {
		'limit': limit,
		'sort': [
			['timestamp', -1]
		]
	}).toArray(function(err, objects) {
		if ( !! err) {
			cb(new Error('mongodb find message error: %j', err));
			return;
		}
		cb(err, objects);
	});
};
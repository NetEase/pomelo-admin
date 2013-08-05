var util = require('util');
var crypto = require('crypto');

var utils = module.exports;

/**
 * Check and invoke callback
 */
utils.invokeCallback = function(cb) {
    if ( !! cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

/*
 * Date format
 */
utils.format = function(date, format) {
    format = format || 'MM-dd-hhmm';
    var o = {
        "M+": date.getMonth() + 1, //month
        "d+": date.getDate(), //day
        "h+": date.getHours(), //hour
        "m+": date.getMinutes(), //minute
        "s+": date.getSeconds(), //second
        "q+": Math.floor((date.getMonth() + 3) / 3), //quarter
        "S": date.getMilliseconds() //millisecond
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1,
                RegExp.$1.length === 1 ? o[k] :
                ("00" + o[k]).substr(("" + o[k]).length));
        }
    }

    return format;
};

utils.compareServer = function(server1, server2) {
    return (server1['host'] === server2['host']) &&
        (server1['port'] === server2['port']);
}

/**
 * Get the count of elements of object
 */
utils.size = function(obj, type) {
    var count = 0;
    for (var i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
            if (!type) {
                count++;
                continue;
            }

            if (type && type === obj[i]['type']) {
                count++;
            }
        }
    }
    return count;
};

utils.defaultAdminUser = [{
    "id": "user-1",
    "username": "admin",
    "password": "admin",
    "level": 1
}, {
    "id": "user-2",
    "username": "monitor",
    "password": "monitor",
    "level": 2
}];

utils.md5 = function(str) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(str);
  str = md5sum.digest('hex');
  return str;
}

utils.checkAndGetUser = function(adminUser, username, password, md5) {
    var len = adminUser.length;
    if (md5) {
        for (var i = 0; i < len; i++) {
            var user = adminUser[i];
            var p = "";
            if(user['username'] === username){
                p = utils.md5(user['password']);
                if(password === p){
                    return user;
                }
            }
        }
    } else {
        for(var i=0;i<len;i++){
            var user = adminUser[i];
            if(user['username'] === username && user['password'] === password){
                return user;
            }
        }
    }
    return false;
}
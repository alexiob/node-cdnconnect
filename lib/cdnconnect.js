//============================================================================
// BidAway API
//
// Author: Alessandro Iob <alessandro.iob@gmail.com>
// Created: 2013/06/03
// Copyright: 2013 Alessandro Iob
//
//============================================================================

var util = require("util");
var path = require("path");
var fs = require("fs");
var restler = require("restler");
var request = require("request");

var API_URL = "https://api.cdnconnect.com";
var API_VERSION = 1;
var API_KEY_PREFIX = 'Bearer ';
var APP_BASE = '.cdnconnect.com';
var USER_AGENT = 'node-cdnconnect';

function CDNConnectClient(config)
{
    this.config = config || {};

    this.apiKey = this.config.apiKey;
    this.appName = this.config.appName;

    if (!this.apiKey) throw Error("apiKey parameter must be defined.");
    if (!this.appName) throw Error("appName parameter must be defined.");

    var apiURL = this.config.apiURL || API_URL;
    var apiVersion = this.config.apiVersion || API_VERSION;
    this.apiURL = util.format("%s/v%s", apiURL, apiVersion);

    this.authKey = API_KEY_PREFIX + this.apiKey;
}

CDNConnectClient.prototype.mkdir = function(cdnPath, next)
{
    // GET https://api.cdnconnect.com/v1/bidaway.cdnconnect.com/<container_folder>/create-path.json

    var self = this;
    self.performAction('GET', cdnPath, 'create-path', function(err, data) {
        if (next) {
            next(err, data);
        }
    });
};

CDNConnectClient.prototype.writeFile = function(filename, cdnPath, next)
{
    // get uploadURL: GET https://api.cdnconnect.com/v1/<destination_folder_url>/upload.json
    // upload to uploadURL: POST multipart/form-data uploadURL
    var self = this;

    if (!fs.existsSync(filename)) {
        return next(new Error('File does not exists: ' + filename), null);
    }

    self.getUploadURL(cdnPath, function(err, data) {
        if (err) {
            if (next) next(err, null);
            return;
        }

        var uploadURL = data.results.upload_url;

        var req = request(
            {
                method: 'POST',
                uri: uploadURL,
                headers: {
                    'User-Agent': USER_AGENT,
                    'Authorization': self.authKey
                }
            },
            function (err, res, data) {
                try {
                    data = JSON.parse(data);
                } catch (parseErr) {
                    err = parseErr;
                }
                if (next) {
                    if (!err) {
                        err = self.buildError(data, res.statusCode);
                    }
                    if (!err) {
                        if (data.results && data.results.files && data.results.files.length) {
                            var fr = data.results.files[0];
                            if (fr.upload_success === false) {
                                if (fr.msgs && fr.msgs[0].info === 'error') {
                                    err = new Error(fr.messages[0].text);
                                } else {
                                    // console.log ('UNKONWN ERROR', fr);
                                }
                            }
                        }
                    }
                    next(err, data);
                }
            }
        );
        var form = req.form();
        form.append('create_upload_url', 'true');
        form.append('file', fs.createReadStream(filename));
    });
};

CDNConnectClient.prototype.unlink = function(cdnPath, moveToTrash, next)
{
    //DELETE https://api.cdnconnect.com/v1/bidaway.cdconnect.com/<file_or_folder_path>.json
    var self = this;

    if (typeof(moveToTrash) === 'function') {
        next = moveToTrash;
        moveToTrash = false;
    }

    if (moveToTrash) moveToTrash = 'true';
    else moveToTrash = 'false';

    self.performAction('DELETE', cdnPath, {move_to_trash: moveToTrash}, function(err, data) {
        if (next) {
            next(err, data);
        }
    });
};

CDNConnectClient.prototype.rename = function(cdnPath, newName, next)
{
    // PUT https://api.cdnconnect.com/v1/bidaway.cdconnect.com/<file_or_folder_path>/rename.json?new_name=
    var self = this;
    self.performAction('PUT', cdnPath, 'rename', {new_name: newName}, function(err, data) {
        if (next) {
            next(err, data);
        }
    });
};

CDNConnectClient.prototype.stat = function(cdnPath, next)
{
    //GET https://api.cdnconnect.com/v1/bidaway.cdconnect.com/<file_or_folder_path>.json
    var self = this;
    self.performAction('GET', cdnPath, function(err, data) {
        if (next) {
            next(err, data);
        }
    });
};

//============================================================================
// UTILITIES

CDNConnectClient.prototype.getUploadURL = function(cdnPath, next)
{
    //GET https://api.cdnconnect.com/v1/bidaway.cdconnect.com/<file_or_folder_path>/upload.json
    var self = this;
    self.performAction('GET', cdnPath, 'upload', function(err, data) {
        if (next) {
            next(err, data);
        }
    });
};

CDNConnectClient.prototype.performAction = function(method, cdnPath, action, args, callback)
{
    var self = this;
    var actionURL = self.buildActionURL(cdnPath, action);

    var data = {};

    if (typeof (action) === 'function') {
        callback = action;
        action = null;
        args = null;
    } else if (typeof(args) === 'function') {
        callback = args;
        args = null;
    }

    if (args) {
        Object.keys(args).forEach(function(k) {
            data[k] = args[k];
        });
    }

    // console.log (method, actionURL, action, cdnPath, args);
    request(
        {
            method: method.toUpperCase(),
            uri: actionURL,
            headers: {
                'User-Agent': USER_AGENT,
                'Authorization': self.authKey
            },
            form: data
        },
        function (err, res, data) {
            try {
                data = JSON.parse(data);
            } catch (parseErr) {
                err = parseErr;
            }
            if (callback) {
                if (!err) {
                    err = self.buildError(data, res.statusCode);
                }
                callback(err, data);
            }
        }
    );
};

CDNConnectClient.prototype.buildActionURL = function(cdnPath, action)
{
    var actionURL = this.apiURL + '/' + this.appName + APP_BASE;

    if (typeof(cdnPath) === 'string') {
        if (cdnPath && cdnPath[0] == '/') cdnPath = cdnPath.substr(1);
        actionURL += '/' + cdnPath;
    }
    if (typeof(action) === 'string') {
        if (actionURL[actionURL.length-1] !== '/') actionURL += '/';
        if (action && action[0] == '/') action = action.substr(1);
        actionURL += action;
    }
    actionURL += '.json';

    return actionURL;
};

CDNConnectClient.prototype.buildError = function(data, statusCode)
{
    var err;

    // console.log('buildError:', statusCode, typeof(data), data);
    if (data && data.msgs && data.msgs.length && data.msgs[0].status === 'error') {
        console.log('ERR', data);
        err = new Error(data.msgs[0].text);
    } else if (statusCode >= 400) {
        switch (statusCode) {
            case 400:
                msg = 'Bad request (400).';
                break;
            case 401:
                msg = 'Not authorized (401)';
                break;
            case 403:
                msg = 'Forbidden (403).';
                break;
            case 404:
                msg = 'Not found (404).';
                break;
            case 405:
                msg = 'Method not allowed (405).';
                break;
            case 500:
                msg = 'Server error (500).';
                break;
            case 502:
                msg = 'Bad gateway (502).';
                break;
            case 503:
                msg = 'Service unavailable (503).';
                break;
        }
        err = new Error(msg);
    }
    return err;
};

module.exports = CDNConnectClient;

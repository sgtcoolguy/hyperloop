/**
 * Android launching.
 */
var fs = require('fs'),
	path = require('path'),
	os = require('os'),
	appc = require('node-appc'),
	wrench = require('wrench'),
	Launcher = require('../launcher').Launcher,
	log = require('../log'),
	programs = require('./programs'),
	Paths = require('./paths');

exports.Launcher = AndroidLauncher;

function AndroidLauncher(options) {
	Launcher.call(this, options);
}

// extend our base class
AndroidLauncher.prototype.__proto__ = Launcher.prototype;

/*
 * Install and launch application
 */
AndroidLauncher.prototype.launch = function(options, args, callback) {
	var name = options.name;
	var paths = Paths.fetch(options);

	log.info('Launching ' + name.green);
	programs.antDebugInstall(options, paths, callback);
};

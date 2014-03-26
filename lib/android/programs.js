/**
 * Interface to Android SDK tools and debug bridge
 */
var path = require('path'),
	log = require('../log'),
	exec = require('child_process').exec;

const MAX_BUFFER_SIZE = Number.MAX_VALUE;

// TODO should invoke android tools
exports.createAndroidProjectTemplate = createAndroidProjectTemplate;

function createAndroidProjectTemplate(options, paths, callback) {
	var destDir = paths.projectTemplateDir;
	var command = 'android create project --target ' + options.sdk
	            + ' --name ' + options.name + ' --path ' + destDir
	            + ' --activity ' + options.name + 'Activity'
	            + ' --package ' + options.appid;
	log.debug('Executing command ' + command);
	exec(command, callback)
}

function curryExec(program, transform) {
	return function(args, done, options) {
		var command = program + ' ' + args,
			output = exec(command, { maxBuffer: MAX_BUFFER_SIZE }, callback);
		output.stdout.on('data', handle);
		output.stderr.on('data', handle);

		function callback(err, stdout, stderr) {
			done(err ? err : undefined, stdout, stderr);
			args = done = null;
		}
	};
}

/*
 Utility.
 */
function handle() {
	log.debug.apply(log, arguments);
}
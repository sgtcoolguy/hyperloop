var _ = require('underscore'),
	async = require('async'),
	colors = require('colors'),
	fs = require('fs'),
	log = require('../../log'),
	path = require('path'),
	wrench = require('wrench');

module.exports = clean;

function clean(opts, args, callback) {

	// validate opts and callback
	callback = arguments[arguments.length-1] || function(err) { throw err; };
	if (_.isFunction(opts) || !opts) {
		opts = {};
		args = [];
	} else if (!_.isObject(opts)) {
		throw new TypeError('Bad arguments');
	}

	async.parallel([

		// delete the build folder
		function(cb) {
			var cleanPath = path.join(opts.dest || '.', 'build');
			fs.exists(cleanPath, function(exists) {
				if (exists) {
					log.info('cleaning ' + cleanPath.yellow);
					wrench.rmdirSyncRecursive(cleanPath);
				}
				return cb();
			});
		},

		// delete metabase
		function(cb) {
			if (opts.metabase) {
				log.warn('"-m,--metabase" option not yet implemented');
			}
			return cb();
		}

	], function(err, result) {
		return callback(err);
	});

}

var async = require('async'),
	hyperloop = require('../../..'),
	log = require('../../log'),
	path = require('path');

module.exports = pkg;

function pkg(options, args, callback) {
	required(options,'src','specify the directory where files should be compiled');
	required(options,'platform','specify the platform to target such as ios, windows, android, etc');

	var platform = options.platform,
		Packager = require(path.join(__dirname, '..', '..', platform, 'packager.js')).Packager,
		packager = new Packager(options);

	// validate args before we compile
	packager.validate(options,args,required);

	// compile then package
	async.series([
		function(cb) {
			hyperloop.compile(options, args, cb);
		},
		function(cb) {
			packager.package(options, args, cb);
		}
	], function(err, result) {
		return callback(err);
	});
}

/**
 * check to make sure that the `name` key is present in `options` and if not
 * exit with the error message `help`
 */
function required(options, name, help) {
	if (!options[name]) {
		log.fatal('Missing required options '+('--'+name).magenta.bold+' which should '+help);
	}
}
var log = require('../log');

// module interface

exports.prepareOptions = prepareOptions;
exports.processDefaultOptions = processDefaultOptions;

// implementation

function prepareOptions(program, opts) {
	opts = opts || {};
	program
		.option('-c, --no-colors', 'turns off color output')
		.option('-d, --project-dir <project-dir>', 'Directory containing the project [.]', '.')
		.option('-f, --force', 'Force the current hyperloop operation')
		.option('-l, --log-level <log-level>', 'Set the log level [info]', 'info')
		.option('-y, --src <src>', 'The source file(s) for the hyperloop app')
		.option('-z, --dest <dest>', 'The build desintation of the hyperloop app');

	if (opts.compile) {
		program
			.option('-a, --appid <appid>', 'The app id used for deploying')
			.option('-A, --arch <arch>', 'Architecture to target [i386]', 'i386')
			.option('-B, --classprefix <classprefix>', 'Prefix for generated classes')
			.option('-C, --cflags <cflags>', 'additional compiler flags for native compiler')
			.option('-D, --debug', 'Compiles in debug mode, sets log level to "debug"')
			.option('-I, --includes <includes>', 'Location of additional header files')
			.option('-j, --jsengine <jsengine>', 'Javascript engine API to target [jsc]')
			.option('-J, --jobs <jobs>', 'Number of compile jobs to run in parallel [50]')
			.option('-l, --launch', 'Launch the app when compiling completes')
			.option('-L, --libname <libname>', 'Library name to build')
			.option('-m, --min-version <min-version>', 'Minimum version of native platform to target')
			.option('-M, --main <main>', 'The name of the main hjs file for your app [app]', 'app')
			.option('-n, --name <name>', 'Name of the hyperloop app to build')
			.option('-o, --package-type <package-type>', 'Whether to build as an app or module [app]', 'app')
			.option('-p, --platform <platform>', 'The platform for this operation [ios]', 'ios')
			.option('-s, --tisdk <tisdk>', 'Titanium SDK to target (used with --ticurrent)')
			.option('-t, --ticurrent', 'Compile for a TiCurrent module')
			.option('-T, --deploy-type <deploy-type>', 'The deployment environment type for this build [development]', 'development');
	}

	program.options.sort(function(a,b) {
		var aCode = a.flags.charCodeAt(1) + (/[A-Z]/.test(a.flags.charAt(1)) ? 32.5 : 0),
			bCode = b.flags.charCodeAt(1) + (/[A-Z]/.test(b.flags.charAt(1)) ? 32.5 : 0);
		return aCode < bCode ? -1 : 1;
	});
}

function processDefaultOptions(program) {
	if (program.colors === false) {
		log.useColor = false;
	}
	if (program.logLevel) {
		log.level = program.logLevel;
	}
	if (program.debug) {
		log.level = 'debug';
	}
}
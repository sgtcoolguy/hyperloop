var path = require('path'),
	appc = require('node-appc'),
	util = require('../util'),
	homeDir = util.writableHomeDirectory(),
	backend = 'templates',
	templateDir = path.join(__dirname, backend, 'template1');

exports.fetch = function(options) {
	var destDir = path.resolve(options.dest),
		srcDir = appc.fs.resolvePath(options.src),
		name = options.name,
		appDir = path.join(destDir, name);

	return {
		srcDir: srcDir,
		homeDir: homeDir,
		templateDir: templateDir,
		destDir: destDir,
		appDir: appDir,
//		slnFile: path.join(appDir, name + '.sln'),
		jscDir: path.join(homeDir, 'JavaScriptCore' + options.sdk),
		guidPath: path.join(destDir, 'guid')
	};
};

var path = require('path'),
	appc = require('node-appc'),
	util = require('../util'),
	homeDir = util.writableHomeDirectory();

exports.fetch = function(options) {
	var destDir = path.resolve(options.dest),
		srcDir = appc.fs.resolvePath(options.src),
		name = options.name,
		appDir = path.join(destDir, name),
		backend = options.backend ? options.backend : 'java',
		templateDir = path.join(__dirname, 'templates', backend),
        projectTemplateDir = path.join(destDir, 'project');

	return {
		srcDir: srcDir,
		homeDir: homeDir,
		templateDir: templateDir,
		projectTemplateDir: projectTemplateDir,
		destDir: destDir,
		appDir: appDir,
		cerFile: path.join(appDir, 'Test_Key.cer'),
		jscDir: path.join(homeDir, 'JavaScriptCore'),
		guidPath: path.join(destDir, 'guid')
	};
};

/**
 * Android packaging
 */
var path = require('path'),
	ejs = require('ejs'),
	fs = require('fs'),
	os = require('os'),
	appc = require('node-appc'),
	wrench = require('wrench'),
	crypto = require('crypto'),
	Packager = require('../packager').Packager,
	log = require('../log'),
	util = require('../util'),
	programs = require('./programs'),
	Paths = require('./paths'),
	jscoreConfigs = {
		'release': {
			version: 'shurink1',
			checksum: '7c9b605f78bdb0983def6a555bfd8449abc330a5'
		}
	},
	urlFormat = 'http://timobile.appcelerator.com.s3.amazonaws.com/jscore/JavaScriptCore-Android-%s-%s.zip',
	urlFormatForJava = 'http://timobile.appcelerator.com.s3.amazonaws.com/jscore/JavaScriptCoreJava-Android-%s-%s.zip';

exports.Packager = AndroidPackager;

function AndroidPackager(options) {
	Packager.call(this, options);
}
AndroidPackager.prototype.__proto__ = Packager.prototype;
AndroidPackager.prototype.validate = validate;
AndroidPackager.prototype.package = packaging;

/*
 * Check the environment and prepare for the packaging
 * Audo-detect sdks and build targets, or ask user input if needed
 */
function validate(options, args, requiredFn, proceed) {
	log.info('Validating...');
	var paths = Paths.fetch(options);

	log.debug('creating ', paths.appDir.cyan);
	wrench.mkdirSyncRecursive(paths.appDir);

	// TODO Auto-select the target API version to latest installed [#324]
	if (!options.sdk) {
		options.sdk = '14';
	}
	if (!options.target) {
		options.target = 'release';
	}

	return proceed();
}

/*
 * Create Android project with given parameters
 * Generate required Android project-related files
 * (we can assume codegen already generates codes for native class),
 * Download latest JavaScriptCore modules
 * Copy them info the build directory and build apk
 */
function packaging(options, args, callback) {
	log.info('Packaging...');

	var paths = Paths.fetch(options),
	   	config = JSON.parse(fs.readFileSync(path.join(paths.destDir, 'config.json'), 'utf8'));

	// Copy the current build's options in to the config.
	config.options = options;
	options.config = config;

	if (!fs.existsSync(paths.projectTemplateDir)) {
		log.debug('Creating project template in ' + paths.projectTemplateDir);
		programs.createAndroidProjectTemplate(options, paths, function(err) {
			if (err) {
				callback(err);
			} else {
				mergeTemplateFiles(options, args, paths, function(err) {
					if (err) {
						callback(err);
					} else {
						mergeProjectFiles(options, args, paths, callback);
					}
				});
			}
		});
	} else {
		log.debug('Using existing project template in ' + paths.projectTemplateDir);
		mergeTemplateFiles(options, args, paths, function(err) {
			if (err) {
				callback(err);
			} else {
				mergeProjectFiles(options, args, paths, callback);
			}
		});
	}
}

function mergeTemplateFiles(options, args, paths, callback) {
	log.debug('Merging project template in ' + paths.templateDir);

	var values = {
		APPNAME: options.name,
		LIBDIR: path.resolve(path.join(paths.jscDir)).replace('/', '\\'),
		MainActivityName: options.name + 'Activity',
		MainActivityPackage: options.appid,
		jsclass_includes: options.config.includes
	};

	// Merge main activity so that JavaScriptCore modules is loaded at startup
	var javaPackageDir = path.join(paths.projectTemplateDir, 'src', options.appid.replace(/\./g, path.sep));
	var from = path.join(paths.templateDir, 'MainActivity.java');
	var to   = path.join(javaPackageDir, values.MainActivityName + '.java');
	var template = fs.readFileSync(from, 'utf8'),
		templated = util.renderTemplate(template, values, __dirname, true);
	wrench.mkdirSyncRecursive(javaPackageDir);
	util.writeIfDifferent(to, templated);

	// Merge helper classes
	javaPackageDir = path.join(paths.projectTemplateDir, 'src', 'com', 'appcelerator', 'hyperloop');
	var from = path.join(paths.templateDir, 'com', 'appcelerator', 'hyperloop', 'Hyperloop.java');
	var to   = path.join(javaPackageDir, 'Hyperloop.java');
	var template = fs.readFileSync(from, 'utf8'),
		templated = util.renderTemplate(template, values, __dirname, true);
	wrench.mkdirSyncRecursive(javaPackageDir);
	util.writeIfDifferent(to, templated);

	callback();
}

function mergeProjectFiles(options, args, paths, callback) {
	log.debug('Copying project files from ' + paths.projectTemplateDir);
	wrench.copyDirRecursive(paths.projectTemplateDir, paths.appDir, {forceDelete: true}, function(err) {
		if (err) {
			callback(err);
		} else {
			mergeGeneratedFiles(options, args, paths, callback);
		}
	})
}

function mergeGeneratedFiles(options, args, paths, callback) {
	var genSrcFrom = path.join(paths.destDir, 'src', 'src');
	var genSrcTo   = path.join(paths.appDir, 'src');

	log.debug('Copying genenerated files from ' + genSrcFrom);

	var files = wrench.readdirSyncRecursive(genSrcFrom);
	files.forEach(function(f) {
		var genSrcFromFile = path.join(genSrcFrom, f);
		var genSrcToFile   = path.join(genSrcTo, f);
		if (util.isDirectory(genSrcFromFile)) {
			wrench.mkdirSyncRecursive(genSrcToFile);
		} else {
			fs.writeFileSync(genSrcToFile, fs.readFileSync(genSrcFromFile));
		}
	});	

	mergeTemplates(options, args, paths, callback);
}

function mergeTemplates(options, args, paths, callback) {
	var name = options.name,
		values = {
			APPNAME: name,
			LIBDIR: path.resolve(path.join(paths.jscDir)).replace('/', '\\'),
			INCLUDEDIR: path.resolve(path.join(paths.jscDir, 'include')).replace('/', '\\'),
			CERTNAME: options.certname
		};

	var	jscDownloadDir = 'JavaScriptCore-Android-' + options.target,
		jscDownloadDirFull = path.join(paths.jscDir, jscDownloadDir);

	downloadJavaScriptCoreModule();

	function downloadJavaScriptCoreModule() {
		log.debug('writing JavaScriptCore into', paths.jscDir.cyan);

		var jscoreConfig = jscoreConfigs[options.target],
			version = jscoreConfig.version,
			checksum = jscoreConfig.checksum,
			url = require('util').format(urlFormat, options.target, version);

		util.downloadResourceIfNecessary(jscDownloadDir, version, url, checksum, paths.jscDir, copyModulesIntoDestination);
	}

	function copyModulesIntoDestination(err) {
		if (err) {
			log.error('Downloading and extracting JavaScriptCore for sdk' + options.sdk + ' failed.');
			log.fatal(err);
		}

		// Copy JavaScriptCore module files into Android libs
		if (util.isDirectory(jscDownloadDirFull)) {
			// Copy JavaScriptCore for Java
			log.debug('Copying modules from ' + jscDownloadDirFull);
			var files = wrench.readdirSyncRecursive(jscDownloadDirFull);
			files.forEach(function(f) {
				var jscCopyTo = path.join(paths.appDir, f);
				var jscCopyFrom = path.join(jscDownloadDirFull, f);
				if (util.isDirectory(jscCopyFrom)) {
					wrench.mkdirSyncRecursive(jscCopyTo);
				} else {
					fs.writeFileSync(jscCopyTo, fs.readFileSync(jscCopyFrom));
				}
			});
			copyResourcesIntoDestination();
		}
	}

	function copyResourcesIntoDestination() {
		log.debug('Copying resources from ' + paths.srcDir);
		if (util.isDirectory(paths.srcDir)) {
			var files = wrench.readdirSyncRecursive(paths.srcDir);
			options.config.hyperloopFiles = [];

			files.forEach(function(f) {
				if (f.indexOf('.') === 0 || f.indexOf(path.sep + '.') !== -1) {
					log.trace('Skipping ' + f);
					return;
				}
				var fp = path.join(paths.srcDir, f),
					isDir = fs.statSync(fp).isDirectory(),
					dest = path.join(paths.appDir, f);
				if (fp.indexOf(options.dest + path.sep) === 0 || fp.indexOf(path.sep + options.dest + path.sep) >= 0) {
					return;
				}

				// Recurse into directories.
				if (isDir) {
					return wrench.mkdirSyncRecursive(dest);
				}

				// track the source files
				if (!isDir && /\.(?:hjs|js|json)$/i.test(f) && f.indexOf('build\\' !== 0)) {
					options.config.hyperloopFiles.push(f);
				}

				// Headers.
				if (/\.(h)$/i.test(f)) {
					options.config.headers.push(f);
				}
				// Implementations.
				else if (/\.(cpp)$/i.test(f)) {
					options.config.implementations.push(f);
				}
				// Shader and vertex files.
				else if (/\.(hlsl)$/i.test(f)) {
					options.config.fxCompile.push({
						file: f,
						type: fs.readFileSync(fp, 'utf8').match(/main\(([A-Z][a-z]+)/)[1]
					});
				}

				if (!/\.(hjs)$/i.test(f)) {
					util.copyFileSync(fp, dest);
				}
			});
		}

		log.info(name.green + ' successfully packaged to:\n\t' + paths.destDir.green + '\n\n');
		callback();
	}
}
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
			version: '3',
			checksum: '86e66223af80b29044d91bc785725820a8e23396'
		}
	},
	jscoreJavaConfigs = {
		'release': {
			version: '3dd23087584a0e476b98eaca0a95843e047e48d3',
			checksum: '33317239e1ebd72b87933a719ba08082d6013c50'
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
		options.sdk = '19';
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

	var paths = Paths.fetch(options);

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
		mergeProjectFiles(options, args, paths, callback);
	}
}

function mergeTemplateFiles(options, args, paths, callback) {
	log.debug('Merging project template in ' + paths.templateDir);

	var values = {
		APPNAME: options.name,
		LIBDIR: path.resolve(path.join(paths.jscDir)).replace('/', '\\'),
		MainActivityName: options.name + 'Activity',
		MainActivityPackage: options.appid
	};

	// Overwrite main activity so that JavaScriptCore modules is loaded at startup
	var javaPackageDir = path.join(paths.projectTemplateDir, 'src', options.appid.replace(/\./g, path.sep));
	var from = path.join(paths.templateDir, 'MainActivity.java');
	var to   = path.join(javaPackageDir, values.MainActivityName + '.java');
	var template = fs.readFileSync(from, 'utf8'),
		templated = util.renderTemplate(template, values, __dirname, true);
	wrench.mkdirSyncRecursive(javaPackageDir);
	util.writeIfDifferent(to, templated);

	callback();
}

function mergeProjectFiles(options, args, paths, callback) {
	log.debug('Copying project files from ' + paths.projectTemplateDir)
	wrench.copyDirRecursive(paths.projectTemplateDir, paths.appDir, {forceDelete: true}, function(err) {
		if (err) {
			callback(err);
		} else {
			mergeTemplates(options, args, paths, callback);
		}
	})
}

function mergeTemplates(options, args, paths, callback) {
	var name = options.name,
		values = {
			APPNAME: name,
			LIBDIR: path.resolve(path.join(paths.jscDir)).replace('/', '\\'),
			INCLUDEDIR: path.resolve(path.join(paths.jscDir, 'include')).replace('/', '\\'),
			CERTNAME: options.certname
		},
		config = JSON.parse(fs.readFileSync(path.join(paths.destDir, 'config.json'), 'utf8')),
		packageJSONPath = path.join(paths.srcDir, 'package.json'),
		packageJSON = !fs.existsSync(packageJSONPath) ? {} : JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));

	// Copy the current build's options in to the config.
	config.options = options;
	options.config = config;	

	var	jscDownloadDir = 'JavaScriptCore-Android-' + options.target,
		jscDownloadDirFull = path.join(paths.jscDir, jscDownloadDir),
		jscJavaDownloadDir = 'JavaScriptCoreJava-Android-' + options.target,
		jscJavaDownloadDirFull = path.join(paths.jscDir, jscJavaDownloadDir);

	downloadJavaScriptCoreModule();

	function downloadJavaScriptCoreModule() {
		log.debug('writing JavaScriptCore into', paths.jscDir.cyan);

		var jscoreConfig = jscoreConfigs[options.target],
			version = jscoreConfig.version,
			checksum = jscoreConfig.checksum,
			url = require('util').format(urlFormat, options.target, version);

		util.downloadResourceIfNecessary(jscDownloadDir, version, url, checksum, paths.jscDir, downloadJavaScriptCoreJavaModule);
	}

	function downloadJavaScriptCoreJavaModule(err) {
		if (err) {
			log.error('Downloading and extracting JavaScriptCore for sdk' + options.sdk + ' failed.');
			log.fatal(err);
		}

		log.debug('writing JavaScriptCore for Java into', paths.jscDir.cyan);

		var jscoreJavaConfig = jscoreJavaConfigs[options.target],
			version = jscoreJavaConfig.version,
			checksum = jscoreJavaConfig.checksum,
			url = require('util').format(urlFormatForJava, options.target, version);

		util.downloadResourceIfNecessary(jscJavaDownloadDir, version, url, checksum, paths.jscDir, copyModulesIntoDestination);
	}

	function copyModulesIntoDestination(err) {
		if (err) {
			log.error('Downloading and extracting JavaScriptCore for Java failed.');
			log.fatal(err);
		}

		// Copy JavaScriptCore module files into Android libs
		if (util.isDirectory(jscDownloadDirFull)) {
			var jscCopyFrom = path.join(jscDownloadDirFull, 'AndroidModulesRelease', 'JavaScriptCore', 'lib');
			var jscCopyTo = path.join(paths.destDir, options.name, 'libs');
			log.debug('Copying modules from ' + jscDownloadDirFull + ' to ' + jscCopyTo);
			wrench.copyDirRecursive(jscCopyFrom, jscCopyTo, {forceDelete: true}, function(err) {
				if (err) {
					callback(err);
				} else {
					// Copy JavaScriptCore for Java
					log.debug('Copying modules from ' + jscJavaDownloadDirFull + ' to ' + jscCopyTo);
					var files = wrench.readdirSyncRecursive(jscJavaDownloadDirFull);
					files.forEach(function(f) {
						var libStart = f.indexOf('/libs/');
						if (libStart != -1) {
							if (f.match('.so'+'$') == '.so') {
								fs.writeFileSync(path.join(jscCopyTo, f.substring(libStart+6)), 
										fs.readFileSync(path.join(jscJavaDownloadDirFull, f)));
							} else if (f.match('.jar'+'$') == '.jar') {
								fs.writeFileSync(path.join(jscCopyTo, f.substring(libStart+6)), 
										fs.readFileSync(path.join(jscJavaDownloadDirFull, f)));
							}
						}
					});

					copyResourcesIntoDestination();
				}
			});
		}
	}

	function copyResourcesIntoDestination() {
		log.debug('Copying resources from ' + paths.srcDir);
		if (util.isDirectory(paths.srcDir)) {
			var files = wrench.readdirSyncRecursive(paths.srcDir);
			config.hyperloopFiles = [];

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
					config.hyperloopFiles.push(f);
				}

				// Headers.
				if (/\.(h)$/i.test(f)) {
					config.headers.push(f);
				}
				// Implementations.
				else if (/\.(cpp)$/i.test(f)) {
					config.implementations.push(f);
				}
				// Shader and vertex files.
				else if (/\.(hlsl)$/i.test(f)) {
					config.fxCompile.push({
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
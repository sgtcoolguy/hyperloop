/**
 * Androiddows packaging
 */
var Packager = require('../packager').Packager,
	path = require('path'),
	ejs = require('ejs'),
	fs = require('fs'),
	appc = require('node-appc'),
	wrench = require('wrench'),
	log = require('../log'),
	util = require('../util'),
//	programs = require('./programs'),
	buildlib = require('./buildlib'),
	Paths = require('./paths'),
	versions = {
		'8.0': '1',
		'8.1': '1'
	},
	checksums = {
		'8.0': '399ace9876be068c35a30fded0b78e5a9ab589e8',
		'8.1': 'TODO'
	},
	urlFormat = 'http://timobile.appcelerator.com.s3.amazonaws.com/jscore/JavaScriptCore-windows-sdk%s-v%s.zip';

exports.Packager = AndroidPackager;

function AndroidPackager(options) {
	log.info('AndroidPackager');
	Packager.call(this, options);
}

// extend our base class
AndroidPackager.prototype.__proto__ = Packager.prototype;

AndroidPackager.prototype.package = function(options, args, callback) {
	log.debug('AndroidPackager.prototype.package');
	log.info('AndroidPackager.prototype.package');
	var paths = Paths.fetch(options),
		name = options.name,
		values = {
			APPNAME: name,
			APPGUID: (fs.existsSync(paths.guidPath) && fs.readFileSync(paths.guidPath, 'utf8')) || util.guid(),
			LIBDIR: path.resolve(path.join(paths.jscDir)).replace('/', '\\'),
			INCLUDEDIR: path.resolve(path.join(paths.jscDir, 'include')).replace('/', '\\'),
			CERTNAME: options.certname,
			PFX: options.pfx,
			PUBLISHERNAME: options.publisher
		}
//	,
//		config = JSON.parse(fs.readFileSync(path.join(paths.destDir, 'config.json'), 'utf8'))
;

config = {
	MainActivityName:"MyActivityName"
};

	// Copy the current build's options in to the config.
//	config.options = options;

//	fs.writeFileSync(paths.guidPath, values.APPGUID);

	log.info('writing JavaScriptCore into', paths.jscDir);
	wrench.mkdirSyncRecursive(paths.appDir);

	/*
	var version = versions[options.sdk],
		checksum = checksums[options.sdk],
		url = require('util').format(urlFormat, options.sdk, version);
*/
	// TODO: We need to build JSC with VS2013 targeting WP8.1, and upload it as JavaScriptCore-windows-sdk8.1-v1.zip.
//	url = 'http://timobile.appcelerator.com.s3.amazonaws.com/jscore/JavaScriptCore-android-' + version + '.zip';
//	JavaScriptCore-Android-release-3.zip
	url = 'http://timobile.appcelerator.com.s3.amazonaws.com/jscore/JavaScriptCore-Android-release-3.zip';

	util.downloadResourceIfNecessary('JavaScriptCore', '1', url, "86e66223af80b29044d91bc785725820a8e23396", paths.homeDir, copyResourcesIntoDestination);
//	util.downloadResourceIfNecessary('JavaScriptCore' + options.sdk, version, url, checksum, paths.homeDir, copyResourcesIntoDestination);

	function copyResourcesIntoDestination(err) {
		if (err) {
			return callback(err);
		}

		if (util.isDirectory(paths.srcDir)) {
			var files = wrench.readdirSyncRecursive(paths.srcDir);
			files.forEach(function(f) {
				var fp = path.join(paths.srcDir, f),
					isDir = fs.statSync(fp).isDirectory(),
					dest = path.join(paths.appDir, f);

				// Recurse into directories.
				if (isDir) {
					return wrench.mkdirSyncRecursive(dest);
				}

				// Headers.
				if (/\.(h)$/i.test(f)) {
					config.headers.push(f);
				}
				// Implementations.
				else if (/\.(c)$/i.test(f)) {
					config.implementations.push(f);
				}
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
				
				if (!isDir && !/\.(hjs)$/i.test(f)) {
					util.copyFileSync(fp, dest);
				}
			});
		}

	log.info('readdir/copyTemplatesIntoDestination ', paths.templateDir);
		var copyTemplatesIntoDestinationCallback = generateCopyTemplatesIntoDestinationCallback(paths.templateDir, paths.appDir);

//		fs.readdir(paths.templateDir, copyTemplatesIntoDestination);
//		fs.readdir(paths.templateDir, copyTemplatesIntoDestinationCallback);

				var subls = fs.readdirSync(paths.templateDir);
				copyTemplatesIntoDestinationCallback(err, subls);
									var args = [
				'debug'
			];
//			buildlib.ndkbuild(paths.appDir, args, callback);
			buildlib.invokebuild(paths.appDir, paths.homeDir, args, callback);
	}

	function generateCopyTemplatesIntoDestinationCallback(currentpath, topath) {
		var currentDirectoryClosureVariable = currentpath;
		var currentDirectoryClosureVariableTo = topath;
		var copyTemplatesIntoDestination = function(err, files) {
			if (err) {
				return callback(err);
			}
		log.info('in copyTemplatesIntoDestination ', paths.jscDir);
		log.info('in copyTemplatesIntoDestination files ' + files);

			files.forEach(function(file) {
		log.info('in copyTemplatesIntoDestination currentDirectoryClosureVariable ' + currentDirectoryClosureVariable);
		log.info('in copyTemplatesIntoDestination file ' + file);
				var from = path.join(currentDirectoryClosureVariable, file),
					to;

				if (!util.isDirectory(from)) {
					to = path.join(currentDirectoryClosureVariableTo, file.replace('App', name));
					// template is the contents of the raw template file from our template directory 
					var template = fs.readFileSync(from, 'utf8'),
						// I don't understand what this is, but filtered looks very much like template
						// This is apparently redundant with ejs
						filtered = util.filterString(template, values)
				if(file==="TestAPI.java")
			{
		log.info('in copyTemplatesIntoDestination template ' + template);
		log.info('in copyTemplatesIntoDestination values ' + values);
		log.info('in copyTemplatesIntoDestination filtered ' + filtered);
			}	
						// config contains a bunch of values for the substitution.
						// complex cases can have arrays of of data used with for-loops in the templates.
						// .options seems to be a special section for special directives
	//
						templated = ejs.render(filtered, config)
	;
					util.writeIfDifferent(to, templated);
	//				util.writeIfDifferent(to, template);
				}
				else {
		log.info('in copyTemplatesIntoDestination recursive currentDirectoryClosureVariable ' + currentDirectoryClosureVariable);
		log.info('in copyTemplatesIntoDestination recursive file ' + file);
		log.info('in copyTemplatesIntoDestination recursive from ' + from);
				var to = path.join(currentDirectoryClosureVariableTo, file);
					
	//				fs.readdir(from, copyTemplatesIntoDestination);
				var copyTemplatesIntoDestinationCallback = generateCopyTemplatesIntoDestinationCallback(from, to);
					
					wrench.mkdirSyncRecursive(to);
			
					var subls = fs.readdirSync(from);
					copyTemplatesIntoDestinationCallback(err, subls);


	//		fs.readdir(paths.templateDir, copyTemplatesIntoDestination);
		//	fs.readdir(paths.templateDir, copyTemplatesIntoDestinationCallback);
					
	//				to = path.join(paths.appDir, file);
	//				wrench.copyDirSyncRecursive(from, to);
				}
			});

	//		log.info(name.green + ' successfully packaged to:\n\t' + paths.slnFile.green + '\n\n');
	//
	//
	//
	/*
						var args = [
					'debug'
				];
	//			buildlib.ndkbuild(paths.appDir, args, callback);
				buildlib.invokebuild(paths.appDir, paths.homeDir, args, callback);
	*/			
				//	callback();
		}
		return copyTemplatesIntoDestination;
	}

	// temp hack: downloadResourceIfNecessary is supposed to call this
	//copyResourcesIntoDestination();
};

AndroidPackager.prototype.validate = function(options, args, requiredFn, proceed) {
	log.debug('AndroidPackager.prototype.validate');
	log.info('AndroidPackager.prototype.validate');
	
/*
	requiredFn(options, 'name', 'specify the name of the application');
	!options.certname && (options.certname = 'CN=Test');
	!options.publisher && (options.publisher = 'Test');

	var paths = Paths.fetch(options),
		name = options.name,
		pvkPath = path.join(paths.appDir, 'Test_Key.pvk'),
		cerPath = path.join(paths.appDir, 'Test_Key.cer'),
		pfxPath = options.pfx && path.join(paths.appDir, options.pfx);

	wrench.mkdirSyncRecursive(paths.appDir);

	// TODO: Once we've uploaded an 8.1 JSC, we can targeting 8.1 with hyperloop.
	if (!{ '8.0': true, '8.1': false }[options.sdk]) {
		log.fatal("Please specify a --sdk of " + '8.0'.yellow + ".");
	}

	// Check if we have a PFX file.
	if (!options.pfx) {
		options.pfx = 'Test_Key.pfx';
		pfxPath = path.join(paths.appDir, options.pfx);
		var globalTestPfxPath = path.join(paths.homeDir, options.pfx);
		if (fs.existsSync(pfxPath)) {
			proceed();
		}
		else if (fs.existsSync(globalTestPfxPath)) {
			log.info('Using test certificate at ' + globalTestPfxPath.yellow + '!');
			fs.createReadStream(globalTestPfxPath).pipe(fs.createWriteStream(pfxPath));
			proceed();
		}
		else {
			log.info('Creating a temporary certificate for you. Please follow the prompts.');
			programs.makecert('-sv "' + pvkPath + '" -n "' + options.certname + '" "' + cerPath + '"', function madeCert(err) {
				if (err && err.code !== 'OK') {
					log.error('Failed to makecert for you: makecert.exe failed.');
					log.fatal(err);
				}
				log.info('Converting the certificate for app signing...');
				programs.pvk2pfx('-pvk "' + pvkPath + '" -spc "' + cerPath + '" -pfx "' + pfxPath + '" -po toto', function madePfx(err) {
					if (err && err.code !== 'OK') {
						log.error('Failed to generate a test certificate for you: pvk2pfx.exe failed.');
						log.fatal(err);
					}
					log.info('Certificate created at ' + pfxPath.yellow + '!');
					fs.createReadStream(pfxPath).pipe(fs.createWriteStream(globalTestPfxPath));
					proceed();
				});
			});
		}
	}
	else if (!fs.existsSync(options.pfx)) {
		log.fatal("No pfx file exists at " + options.pfx.yellow + ". " + "Hint: Omit --pfx if you want to use a test certificate.".green);
	}
	else {
		if (!fs.existsSync(pfxPath)) {
			// Copy the PFX in to the project.
			fs.createReadStream(options.pfx).pipe(fs.createWriteStream(pfxPath));
		}
		proceed();
	}
	*/
	log.info('AndroidPackager.prototype.validate ' + proceed);
	
//			proceed();
//	log.info('AndroidPackager.prototype.validate ' + proceed);
			
			return true;
	
};


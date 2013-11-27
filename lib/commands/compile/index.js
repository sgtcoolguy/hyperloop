var _ = require('underscore'),
	appc = require('node-appc'),
	async = require('async'),
	colors = require('colors'),
	compiler = require('../../compiler'),
	crypto = require('crypto'),
	fs = require('fs'),
	log = require('../../log'),
	path = require('path'),
	util = require('../../util'),
	wrench = require('wrench');

module.exports = compile;

function compile(options, args, callback) {

	// validate opts and callback
	callback = arguments[arguments.length-1] || function(err) { throw err; };
	if (_.isFunction(options) || !options) {
		options = {};
		args = [];
	} else if (!_.isObject(options)) {
		throw new TypeError('Bad arguments. "options", if defined, must be an object.');
	}

	required(options,'src','specify the directory of files to be compiled, or a specific file to compile');
	required(options,'dest','specify the directory where files will be generated');
	required(options,'platform','specify the platform to target such as ios, windows, android, etc');

	var platform = options.platform,
		src = appc.fs.resolvePath(options.src),
		isDir = util.isDirectory(src),
		codegen = new (require(path.join(__dirname,'..','..',platform,'codegen.js')).Codegen)(options),
		SourceFile = require(path.join(__dirname,'..','..',platform,'sourcefile.js')).SourceFile,
		prefix = options.prefix ? options.prefix + '/' : '',
		asts = [];

	var files = isDir ? filelisting(src, /\.h?js$/) : [src];

	if (files.length===0) {
		log.fatal('No source files found at',src.magenta);
	}

	if (!fs.existsSync(options.dest)) {
		wrench.mkdirSyncRecursive(options.dest);
	}

	// force an option for the src directory
	options.srcdir = path.join(options.dest, 'src');

	if (!options.classprefix)
	{
		options.classprefix = 'hl$';
	}

	var fileCache = {},
		fileCacheFn = path.join(options.srcdir,'.srccache.json');

	if (fs.existsSync(fileCacheFn)) {
		try {
			fileCache = JSON.parse(fs.readFileSync(fileCacheFn).toString());
		}
		catch(E){
			// if for some reason we can't read it, skip it
			log.debug(E);
		}
	}
	codegen.setFileCache(fileCache);

	var env = options.environment,
		env_dev = /^dev/i.test(env) || !env,
		env_prod = /^prod/i.test(env),
		env_test = /^test/i.test(env),
		build_opts = {
			"DEBUG": options.debug || false,
			"TITANIUM_VERSION": "0.0.0",
			"TITANIUM_BUILD_HASH": "",
			"TITANIUM_BUILD_DATE": new Date().toString(),
			"OS_IOS": /(ios|iphone|ipad)/i.test(platform),
			"OS_IPHONE": /(ios|iphone)/i.test(platform),
			"OS_IPAD": /(ios|ipad)/i.test(platform),
			"OS_ANDROID": /(android)/i.test(platform),
			"OS_BLACKBERRY": /(blackberry)/i.test(platform),
			"OS_WEB": /(web|html)/i.test(platform),
			"OS_MOBILEWEB": /(web|html)/i.test(platform),
			"OS_TIZEN": /(tizen)/i.test(platform),
			"ENV_DEV": env_dev,
			"ENV_DEVELOPMENT": env_dev,
			"ENV_TEST": env_test,
			"ENV_PRODUCTION": env_prod
		},
		ti_key = /^ti-/i,
		hl_key = /^hl-/i;

	// attempt to pass in any additional keys from command line which will
	// customize our compression
	Object.keys(options).forEach(function(k){
		var value = options[k];
		if (ti_key.test(k)) {
			k = k.replace(ti_key,'TITANIUM_').replace(/-/g,'_').toUpperCase();
			build_opts[k] = value;
		} else if (hl_key.test(k)) {
			k = k.replace(hl_key,'HYPERLOOP_').replace(/-/g,'_').toUpperCase();
			build_opts[k] = value;
		} else {
			build_opts[k.toUpperCase()] = value;
		}
	});


	files.forEach(function(filename){
		if (!fs.existsSync(filename)) {
			log.fatal("Couldn't find source file",filename.magenta);
		}

		var relativeFilename = isDir ? filename.replace(path.resolve(src),'') : src,
			relativeFilename = relativeFilename.charAt(0)==='/' ? relativeFilename.substring(1) : relativeFilename,
			isHJS = /\.hjs$/.test(relativeFilename),
			jsfilename = relativeFilename.replace(/[\s-\/]/g,'_').replace(/\.h?js$/,''), // replace invalid chars
			relativeFilename = prefix + relativeFilename,
			source = fs.readFileSync(filename).toString(),
			sourceHash = crypto.createHash('md5').update(source).digest('hex'),
			cachedFile = fileCache[jsfilename];

		try {
			var sourcefile = new SourceFile(relativeFilename,jsfilename,options,args),
				ast = isHJS && compiler.compile(source,filename,sourcefile,build_opts);

			asts.push({ast:ast,sourcefile:sourcefile,filename:filename,jsfilename:jsfilename,sourceHash:sourceHash,cachedFile:cachedFile});
			codegen.addSource(sourcefile);
		}
		catch(E) {
			log.debug(E.stack);
			return log.fatal(E.message+" in "+filename.green+" at "+E.line+":"+E.col);
		}
	});

	// copy in _source-map.js
	var mapDir = path.join(options.dest, 'src', '_map');
	var sourceMapFile = '_source-map.js';
	wrench.mkdirSyncRecursive(mapDir, 0755);
	util.copyFileSync(
		path.join(__dirname, '..', '..', '..', 'deps', sourceMapFile),
		path.join(mapDir, sourceMapFile)
	);

	function generateASTs(asts) {
		log.debug('using JS compress options:',JSON.stringify(build_opts).grey);

		var sourceResults = {};

		asts.forEach(function(entry) {
			var sourcefile = entry.sourcefile,
				filename = entry.filename,
				jsfilename = entry.jsfilename,
				sourceHash = entry.sourceHash,
				cachedFile = entry.cachedFile,
				jssrc = path.join(options.dest, 'src', jsfilename + '.js'),
				jssrcMap = path.join(mapDir, jsfilename + '.js.map'),
				sourcecode, compressed;

			if (entry.ast) {
				compressed = compiler.compress(entry.ast, build_opts, filename, path.resolve(jssrc));
				sourcecode = compressed.code;
			} else {
				// this is just plain ole JS, not HJS
				sourcecode = fs.readFileSync(filename).toString();
			}

			if (options.debug) {
				fs.writeFileSync(jssrc, sourcecode);
				log.debug('wrote output JS at ' + jssrc.yellow);

				if (compressed) {
					fs.writeFileSync(jssrcMap, compressed.map);
					log.debug('wrote output JS sourcemap at ' + jssrcMap.yellow);
				}
			}

			sourcefile.finish(sourcecode);

			// map our generate source into our results
			sourceResults[sourcefile.filename] = sourcecode;

			// remember cached file info
			fileCache[jsfilename] = {
				sourceHash: sourceHash,
				sourcefile: sourcefile
			};
		});

		return sourceResults;
	}

	codegen.generate(asts,generateASTs,function(err,file){
		if (err) {
			log.fatal(err.toString());
		}
		if (file) {

			// only write out the cached file if we are passed a file, otherwise,
			// its unchanged from previous compile
			fs.writeFileSync(fileCacheFn,JSON.stringify(fileCache,null,'\t'));
		}

		// !options.dontExit && process.exit(0);
		// options.callback && options.callback();

		return callback();
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

/**
 * recursively get a listing of files for a given directory
 */
function filelisting(dir, filter, files) {
	files = files || [];
	fs.readdirSync(dir).forEach(function(f){
		f = path.join(path.resolve(dir),f);
		if (util.isDirectory(f)) {
			filelisting(f, filter, files);
		}
		else {
			filter.test(f) && files.push(f);
		}
	});
	return files;
}

/**
 * wrapper around the Java metabase generator
 */
var fs = require('fs'),
	path = require('path'),
	spawn = require('child_process').spawn,
	wrench = require('wrench'),
	log = require('../log'),
	metabase;

function getTargetClassDir() {
	var dir;
	switch(process.platform) {
		case 'darwin': {
//			dir = path.join(process.env.HOME,'Library','Application Support','org.appcelerator.hyperloop');
			dir = path.join(process.env.HOME,'Library','Caches','org.appcelerator.hyperloop');
			break;
		}
		case 'win32': {
			dir = path.join(process.env.HOMEPATH || process.env.USERPROFILE,'.hyperloop');
			break;
		}
		default: {
			dir = path.join(process.env.HOME,'.hyperloop');
			break;
		}
	}
	wrench.mkdirSyncRecursive(dir);
	return dir;
}

function compileIfNecessary(cp, callback) {
	var outdir = getTargetClassDir(),
		classFile = path.join(outdir,'JavaMetabaseGenerator.class');
log.info('metabase.js: in compileIfNecessary ' + outdir + ' ' + classFile);


	if (fs.existsSync(classFile)) {
log.info('metabase.js: in fs.existsSync');
		return callback(null);
	}
	else {
log.info('metabase.js: not in fs.existsSync');
		var p = spawn('javac',['-source','1.6','-target','1.6','-cp',cp,path.join(__dirname,'JavaMetabaseGenerator.java'),'-d',outdir],{env:process.env}),
			err = '';

		p.stderr.on('data', function(buf){
			err+=buf.toString();
		});
		p.on('close',function(exitCode){
			callback(exitCode===0 ? null : err);
		});
	}
}

/**
 * generate a buffer
 */
function generate(classPath, callback) {
log.info('metabase.js: in generate ' + classPath);

	// cache it in memory
	if (metabase) return callback(null, metabase);

	log.info('metabase.js: passed cache');

	classPath = typeof(classPath)==='string' ? [classPath] : classPath;

	var cp = [path.join(__dirname,'bcel-5.2.jar'),path.join(__dirname,'json.jar'),path.join(__dirname), getTargetClassDir()].concat(classPath).join(path.delimiter);
	log.info('metabase.js: cp ' + cp);
//	cp = '"' + cp + '"';
//	log.info('metabase.js: cp ' + cp);
//	cp = "/Users/ewing/Source/LANICA/APPC/hyperloop/lib/android/bcel-5.2.jar:/Users/ewing/Source/LANICA/APPC/hyperloop/lib/android/json.jar:/Users/ewing/Source/LANICA/APPC/hyperloop/lib/android:/Library/Frameworks/Android/android-sdk/platforms/android-19/android.jar";
//	log.info('metabase.js: cp ' + cp);


	compileIfNecessary(cp, function compileIfNecessaryCallback(err)  {
	log.info('metabase.js: compileIfNecessary');
		if (err) return callback(err);
	log.info('metabase.js: spawning');
	log.info('metabase.js: env:process.env ' + process.env);
	log.info('metabase.js: cp ' + cp );
		
	var jmg_path = path.join(__dirname,'JavaMetabaseGenerator');
	log.info('metabase.js: jmg_path ' + jmg_path);

		var p = spawn('java',['-Xmx1G','-classpath',cp,'JavaMetabaseGenerator'],{env:process.env}),
			out = '',
			err = '';
		p.stdout.on('data',function(buf){
			out+=buf.toString();
//	log.info('metabase.js: data1 ' + out);
		});

		p.stderr.on('data',function(buf){
			err+=buf.toString();
	log.info('metabase.js: data2 err ' + err);
		});

		p.on('close',function(exitCode){
	log.info('metabase.js: compileIfNecessary on close');
			
			metabase = out;
			callback(exitCode===0 ? null : err, out);
		});
	log.info('metabase.js: end of compileIfNecessary ' + metabase);
		
	});
}

/**
 * generate a JSON object
 */
function generateJSON(classPath, callback) {
	generate(classPath,function(err,buffer){
		if (err) return callback(err);
		return callback(null, JSON.parse(buffer));
	});
}

/**
 * generate a File
 */
function generateFile(classPath, file, callback) {
	generate(classPath,function(err,buffer){
		if (err) return callback(err);
		fs.writeFileSync(file, buffer);
		callback(null, file);
	});
}

exports.generate = generate;
exports.generateJSON = generateJSON;
exports.generateFile = generateFile;

if (module.id===".") {
	//var androidPath = '/opt/android/platforms/android-17/android.jar';
	var androidPath = process.env.ANDROID_SDK_ROOT + '/platforms/android-19/android.jar'
log.info('metabase.js: in module.id==="."');

	generate(androidPath, function(err,buf){
		if (err) {
			log.fatal(err);
		}
		log.log(buf);
		process.exit(0);
	});
}

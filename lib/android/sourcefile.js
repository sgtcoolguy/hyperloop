/**
 * Android implementation of SourceFile
 */
var SourceFile = require('../sourcefile').SourceFile,
	path = require('path'),
	fs = require('fs');

function AndroidSourceFile(filename, name, options, args) {
	SourceFile.call(this, filename, name, options, args);
	this.className = path.join(__dirname,'sourcefile.js');
	this._symbols = [];
}

AndroidSourceFile.prototype.__proto__ = SourceFile.prototype;

AndroidSourceFile.prototype.isCacheable = function(srcdir) {
	return fs.existsSync(this.generateFilename(srcdir));
};

AndroidSourceFile.prototype.generateFilename = function(srcdir) {
	return path.join(srcdir, this.name+'.java');
};

/**
 * called to parse the `@import` statement is encountered
 */
AndroidSourceFile.prototype.parseImport = function(node, value) {
	var result = {type:'package',value:value};
	this._symbols.push(result);
	return [result];
};

/**
 * called when a new custom class from `@class` statement is constructed
 */
AndroidSourceFile.prototype.processCustomClass = function(node, className, extendsName, interfaces, methods, symbol) {
	this._symbols.indexOf(className)===-1 && this._symbols.push(className);
	return SourceFile.prototype.processCustomClass.call(this,node, className, extendsName, interfaces, methods, symbol);
};


exports.SourceFile = AndroidSourceFile;

var hyperloop = require('../../lib/hyperloop'),
	log = require('../../lib/log'),
	should = require('should'),
	_ = require('underscore');

var FATAL = 'fatal';

describe('lib/hyperloop.js', function() {

	it('exports clean', function() {
		should.exist(hyperloop.clean);
		hyperloop.clean.should.be.a.Function;
	});

	it('exports compile', function() {
		should.exist(hyperloop.compile);
		hyperloop.compile.should.be.a.Function;
	});

	it('exports package', function() {
		should.exist(hyperloop.package);
		hyperloop.package.should.be.a.Function;
	});

});
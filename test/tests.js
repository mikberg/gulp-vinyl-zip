'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var through = require('through2');
var temp = require('temp').track();
var vfs = require('vinyl-fs');
var rimraf = require('rimraf');
var lib = require('..');

describe('gulp-vinyl-zip', function () {
	it('src should be able to read from archives', function (cb) {
		var count = 0;

		lib.src(path.join(__dirname, 'assets', 'archive.zip'))
			.pipe(through.obj(function(chunk, enc, cb) {
				count++;
				cb();
			}, function () {
				assert.equal(7, count);
				cb();
			}));
	});

	it('dest should be able to create an archive from another archive', function (cb) {
		var dest = temp.openSync('gulp-vinyl-zip-test').path;

		lib.src(path.join(__dirname, 'assets', 'archive.zip'))
			.pipe(lib.dest(dest))
			.on('end', function () {
				assert(fs.existsSync(dest));
				cb();
			});
	});

	it('dest should be able to create an archive\'s directory tree', function (cb) {
		var dest = temp.mkdirSync('gulp-vinyl-zip-test');
		var archive = path.join(dest, 'foo', 'bar', 'archive.zip');

		lib.src(path.join(__dirname, 'assets', 'archive.zip'))
			.pipe(lib.dest(archive))
			.on('end', function () {
				assert(fs.existsSync(archive));
				cb();
			});
	});

	it('should be compatible with vinyl-fs', function (cb) {
		var dest = temp.mkdirSync('gulp-vinyl-zip-test');

		lib.src(path.join(__dirname, 'assets', 'archive.zip'))
			.pipe(vfs.dest(dest))
			.on('end', function () {
				assert(fs.existsSync(dest));

				// TODO: this should be 4, but symlinks are not supported by vinyl-fs yet
				assert.equal(3, fs.readdirSync(dest).length);
				cb();
			});
	});

	it('dest should preserve stat', function (cb) {
		var dest = temp.openSync('gulp-vinyl-zip-test').path;
		var stats = Object.create(null);

		lib.src(path.join(__dirname, 'assets', 'archive.zip'))
			.pipe(through.obj(function (file, enc, cb) {
				assert(file.stat);
				stats[file.path] = file.stat;
				cb(null, file);
			}, function (cb) {
				this.emit('end');
				cb();
			}))
			.pipe(lib.dest(dest))
			.on('end', function () {
				var count = 0;

				lib.src(dest)
					.pipe(through.obj(function (file, enc, cb) {
						count++;

						if (stats[file.path].atime.valueOf() || file.stat.atime.valueOf()) {
							assert.equal(stats[file.path].atime.getTime(), file.stat.atime.getTime());
						}

						if (stats[file.path].ctime.valueOf() || file.stat.ctime.valueOf()) {
							assert.equal(stats[file.path].ctime.getTime(), file.stat.ctime.getTime());
						}

						if (stats[file.path].mtime.valueOf() || file.stat.mtime.valueOf()) {
							assert.equal(stats[file.path].mtime.getTime(), file.stat.mtime.getTime());
						}

						assert.equal(stats[file.path].isFile(), file.stat.isFile());
						assert.equal(stats[file.path].isDirectory(), file.stat.isDirectory());
						assert.equal(stats[file.path].isSymbolicLink(), file.stat.isSymbolicLink());

						cb();
					}, function () {
						assert.equal(7, count);
						cb();
					}));
			});
	});

	it('dest should not assume files have `stat`', function (cb) {
		var dest = temp.openSync('gulp-vinyl-zip-test').path;

		lib.src(path.join(__dirname, 'assets', 'archive.zip'))
			.pipe(through.obj(function(chunk, enc, cb) {
				delete chunk.stat;
				this.push(chunk);
				cb();
			}))
			.pipe(lib.dest(dest))
			.on('end', cb);
	});
});

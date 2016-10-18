var fs          = require('fs')
var path        = require('path');
var gulp        = require('gulp');
var $           = require('gulp-load-plugins')();
var sync        = require('browser-sync').create();
var gutil       = require('gulp-util');
var pkg         = require('./package.json');
var join        = path.join.bind(path);
var noop        = gutil.noop.bind(gutil);
var print       = $.print();
var reloadAfter = 256;
var left        = reloadAfter;
var utils       = require('./utils');
var dirtreeSync = utils.dirtreeSync;
var getdata     = utils.getdata;

function compileStylus() {
  var compile     = $.stylus({ 'include css': true }),
      files       = join('src', 'stylus', 'main.styl'),
      catcherrs   = $.plumber(),
      rename      = $.rename({ dirname: '.' }),
      startmap    = $.sourcemaps.init(),
      endmap      = $.sourcemaps.write('.', {  
        includeContent : true,
        sourceRoot     : '/stylus'
      }),
      write       = gulp.dest(join('public', 'css')),
      inject      = function() {
        if (left-- === 0) {
          left = reloadAfter;
          sync.reload();
        }
        return sync.stream();
      }

  return gulp.src(files)
    .pipe(catcherrs)
    .pipe(startmap)
    .pipe(compile)
    .pipe(rename)
    .pipe(endmap)
    .pipe(write)
    .pipe(global.isWatch ?
          inject() :
          noop())
};

function compileJade() {
  var jadeopt   = {
    basedir: path.join(__dirname, 'src', 'jade'),
    data: {
      projectName : pkg.name,
      jsv0        : 'javscript:void(0)',
      getdata     : function(file) {
        return getdata(path.join(__dirname, 'src', 'data'), file);
      }
    }
  };

  var compile   = $.jade(jadeopt),
      files     = join('src', 'jade', '**', '*.jade'),
      pages     = join('src', 'jade', 'pages', '**', '*.jade'),
      prettify  = $.jsbeautifier({
        extra_liners      : [],
        indent_inner_html : true,
        indent_size       : 2,
        preserve_newlines : true,
        unformatted       : []
      }),
      reporter  = $.jsbeautifier.reporter(),
      catcherrs = $.plumber(),
      cached    = $.cached(),
      findpage  = $.jadeInheritance({ basedir: join('src', 'jade') }),
      rename    = $.rename({ dirname: '.' }),
      write     = gulp.dest('public'),
      onlypages = $.filter([ pages ]),
      onlynew   = $.newer({
        dest: 'public',
        ext: '.html',
        map: function(relpath) {
          return path.basename(relpath);
        } 
      });

  return gulp.src(files)
    .pipe(catcherrs)
    .pipe(global.isWatch ?
          onlynew :
          noop())
    .pipe(global.isWatch ?
          cached :
          noop())
    .pipe(global.isWatch ?
          findpage :
          noop())
    .pipe(onlypages)
    .pipe(compile)
    .pipe(prettify)
    .pipe(reporter)
    .pipe(rename)
    .pipe(write)      
};

function reload() {
  return sync.reload();
}

function server() {
  sync.init({
    reloadOnRestart : true,
    ghostMode       : { scroll: true },
    notify          : false,
    server          : [ 'public', 'src' ],
    open            : false,
    port            : 3000,
    socket          : { domain: 'localhost:3000' }
  });
};

function buildPagesjson() {
  var dirpath  = path.join(__dirname, 'src', 'jade', 'pages');
  var destpath = path.join(__dirname, 'src', 'data', 'pages.json');
  var data     = dirtreeSync(dirpath);
  var jsondata = JSON.stringify(data, null, '  ');
  var file     = fs.openSync(destpath, 'w');
  fs.writeSync(file, jsondata);
}

gulp.task('build:pages.json', buildPagesjson);
gulp.task('compile:stylus', compileStylus);
gulp.task('compile:jade', ['compile:stylus', 'build:pages.json'], compileJade);
gulp.task('recompile:stylus', compileStylus);
gulp.task('recompile:jade', compileJade);
gulp.task('reload', ['recompile:jade'], reload);
gulp.task('server', ['compile:jade'], server);
gulp.task('watch', ['server'], function() {
  global.isWatch = true;
  gulp.watch(join('src', 'stylus', '**', '*.styl'), ['recompile:stylus']);
  gulp.watch(join('src', 'jade', '**', '*.jade'), ['reload']);
})

gulp.task('default', ['watch']);

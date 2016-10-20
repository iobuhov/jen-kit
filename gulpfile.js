var fs           = require('fs')
var path         = require('path');
var gulp         = require('gulp');
var gutil        = require('gulp-util');
var $            = require('gulp-load-plugins')();
var sync         = require('browser-sync').create();
var postbem      = require('posthtml-bem');
var cliargs      = require('command-line-args');
var postbemsugar = require('./vendor/posthtml-bem-sugar.es5.js');
var pkg          = require('./package.json');
var utils        = require('./utils');
var dirtreeSync  = utils.dirtreeSync;
var getdata      = utils.getdata;
var prepareb     = utils.prepareBlock;
var join         = path.join.bind(path);
var noop         = gutil.noop.bind(gutil);
var print        = $.print();
var reloadAfter  = 256;
var left         = reloadAfter;

function bem() {
  var optionDefinitions = [
    { name: 'command', type: String, defaultOption: true },
    { name: 'name', type: String, alias: 'n' }
  ];
  var args = cliargs(optionDefinitions);
  if (args.command === 'bem' && args.name) {
    prepareb(path.join('src', 'blocks'), args.name);
  }
}

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
    // .pipe(startmap)
    .pipe(compile)
    .pipe(rename)
    // .pipe(endmap)
    .pipe(write)
    .pipe(global.isWatch ?
          inject() :
          noop())
};

function compileJade() {
  var jadeopt   = {
    basedir: path.join(__dirname, 'src'),
    data: {
      projectName : pkg.name,
      jsv0        : 'javscript:void(0)',
      getdata     : function(file) {
        return getdata(path.join(__dirname, 'src', 'data'), file);
      }
    }
  };

  // all go to plugin except index.jade
  function indexIgnore(plugin) {
    result = $.if(function(file) {
      return global.isWatch && !/pages[\\\/]index.jade/.test(file.path);
    }, plugin);
    return result;
  }

  var compile   = $.jade(jadeopt),
      files     = join('src', '**', '*.jade'),
      pages     = join('src', 'pages', '**', '*.jade'),
      report    = $.jsbeautifier.reporter(),
      catcherrs = $.plumber(),
      findpage  = $.jadeInheritance({ basedir: 'src' }),
      rename    = $.rename({ dirname: '.' }),
      write     = gulp.dest('public'),
      onlypages = $.filter([ pages ]),
      cached    = indexIgnore($.cached('jade')),
      posthtml  = $.posthtml([
        postbemsugar({
          blockPrefix: 'b_',
          elemPrefix: 'e_',
          modPrefix: 'm_',
          modDelim: '_'
        }),
        postbem({
          elemPrefix: '__',
          modPrefix: '--',
          modDlmtr: '_'
        })
      ]),
      prettify  = $.jsbeautifier({
        extra_liners      : [],
        indent_inner_html : true,
        indent_size       : 2,
        preserve_newlines : true,
        unformatted       : []
      }),
      onlynew   = indexIgnore($.newer({
        dest: 'public',
        ext: '.html',
        map: function(relpath) {
          return path.basename(relpath);
        }
      }));

  return gulp.src(files)
    .pipe(catcherrs)
    .pipe(onlynew)
    .pipe(cached)
    .pipe(global.isWatch ?
          findpage :
          noop())
    .pipe(onlypages)
    .pipe(compile)
    .pipe(posthtml)
    .pipe(prettify)
    .pipe(report)
    .pipe(rename)
    .pipe(write)
};

function reload() {
  return sync.reload();
};

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
  var dirpath  = path.join(__dirname, 'src', 'pages');
  var destpath = path.join(__dirname, 'src', 'data', 'pages.json');
  var data     = dirtreeSync(dirpath);
  var jsondata = JSON.stringify(data, null, '  ');
  var file     = fs.openSync(destpath, 'w');
  fs.writeSync(file, jsondata);
  fs.closeSync(file);
};

function logPlugins() {
  console.log($);
}

gulp.task('plugins'          , logPlugins);
gulp.task('bem'              , bem);
gulp.task('build:pages.json' , buildPagesjson);
gulp.task('compile:stylus'   , compileStylus);
gulp.task('compile:jade'     , ['compile:stylus', 'build:pages.json'], compileJade);
gulp.task('recompile:stylus' , compileStylus);
gulp.task('recompile:jade'   , ['build:pages.json'], compileJade);
gulp.task('reload'           , ['recompile:jade'], reload);
gulp.task('server'           , ['compile:jade'], server);
gulp.task('watch'            , ['server'], function() {
  global.isWatch = true;
  // gulp.watch(
  //   [join('src', 'pages', '*.jade')],
  //   function (event) {
  //     if (!event.type === 'changed') {
  //       global.fullBuild = true;
  //       buildPagesjson();
  //     }
  //   });
  // gulp.watch(
  //   [join('src', 'data', 'pages.json')],
  //   ['compile:jade']
  // )
  gulp.watch(
    [
      join('src', 'stylus', '**', '*.styl'),
      join('src', 'blocks', '**', '*.styl')
    ],
    ['recompile:stylus']);
  gulp.watch(
    [
      join('src', 'blocks', '**', '*.jade'),
      join('src', 'layouts', '*.jade'),
      join('src', 'mixins', '*.jade'),
      join('src', 'pages', '**', '*.jade')
    ],
    ['reload']);
});

gulp.task('default', ['watch']);

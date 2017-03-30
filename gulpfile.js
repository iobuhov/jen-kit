// -----------------------------------------------------------------------------
// gulpfile.js --- Jen-kit gulp configuration file
//
// Copyright (c) 2017 Ilya Obuhov
//
// Author: Ilya Obuhov <iobuhov.mail@gmail.com>
// URL: https://github.com/iobuhov



// -----------------------------------------------------------------------------
// Available tasks:
//   `gulp`



// -----------------------------------------------------------------------------
// Modules
//
// gulp               : The streaming build system
// gulp-autoprefixer  : Prefix CSS
// gulp-load-plugins  : Automatically load Gulp plugins
// gulp-plumber       : Prevent pipe breaking from errors
// gulp-rename        : Rename files
// gulp-util          : Utility functions
// gulp-watch         : Watch stream
// browser-sync       : Sync compiled files with browser
// posthtml-bem       : BEM-style syntax plugin for PostHTML postprocessor
// utils              : Jen-kit utility functions
// posthtml-bem-sugar : Simplify BEM naming structure in jade/pug
//
// -----------------------------------------------------------------------------

// Plugins

var $                = require('gulp-load-plugins')();
var cliargs          = require('command-line-args');
var gulp             = require('gulp');
var gutil            = require('gulp-util');
var postHtmlBEM      = require('posthtml-bem');
var postHtmlBEMSugar = require('posthtml-bem-sugar');
var runSequence      = require('run-sequence');
var sync             = require('browser-sync').create();
var stylusBemSugar   = require('stylus-bem-sugar');



// Node Modules

var fs               = require('fs')
var path             = require('path');

// Utils

var utils            = require('./utils');
var dirtreeSync      = utils.dirtreeSync;
var generateBlock    = utils.generateBlock;
var getData          = utils.getdata;


// Module globals

var log              = gutil.log.bind(gutil);
var noop             = gutil.noop.bind(gutil);
var pjoin            = path.join.bind(path);
var pkg              = require('./package.json');
var print            = $.print();



// -----------------------------------------------------------------------------
// Gulp Tasks Declaration
//

// Tasks object -- keep refs for all task callbacks
var tasks = {

  block: block,

  compile: {
    stylus: CompileStylus(),
    pug: CompilePug()
  },

  copy: { assets: copyAssets },

  parse: { pages: parsePagesDir },

  plugins: logPlugins,

  reload: reload,

  seq: {
    assets: seqAssets,
    pug: seqPug,
    server: seqServer,
    watch: seqWatch
  },

  server: server,

  watch: {
    assets: watchAssets(),
    pug: watchPug(),
    stylus: watchStylus()
  }

}

gulp.task('block'           , tasks.block);
gulp.task('compile:pug'     , tasks.compile.pug);
gulp.task('compile:stylus'  , tasks.compile.stylus);
gulp.task('copy:assets'     , tasks.copy.assets)
gulp.task('parse:pages'     , tasks.parse.pages);
gulp.task('plugins'         , tasks.plugins);
gulp.task('reload'          , tasks.reload);
gulp.task('seq:pug'         , tasks.seq.pug);
gulp.task('seq:server'      , tasks.seq.server);
gulp.task('seq:watch'       , tasks.seq.watch);
gulp.task('seq:assets'      , tasks.seq.assets);
gulp.task('server'          , tasks.server);
gulp.task('watch:assets'    , tasks.watch.assets);
gulp.task('watch:pug'       , tasks.watch.pug);
gulp.task('watch:stylus'    , tasks.watch.stylus);
gulp.task('default'         , ['seq:server']);


// -----------------------------------------------------------------------------
// Pug sequence

function seqPug() {
  runSequence('parse:pages', 'compile:pug', 'reload')
}

// -----------------------------------------------------------------------------
// Assets sequence

function seqAssets() {
  runSequence('copy:assets', 'reload')
}

// -----------------------------------------------------------------------------
// Server seq

function seqServer(cb) {
  runSequence(['parse:pages', 'compile:stylus', 'copy:assets'],
              'compile:pug',
              'seq:watch',
              'server', cb)
}

// -----------------------------------------------------------------------------
// Watch sequence

function seqWatch(cb) {
  global.isWatch = true;
  runSequence(['watch:assets', 'watch:pug', 'watch:stylus'])
  cb();
}

// -----------------------------------------------------------------------------
// Watch Pug

function watchPug() {
  var root = 'src',
      dirs = ['blocks', 'layouts', 'mixins', 'pages', 'data'],
      files = dirs.map(function(dir) {
        return pjoin(root, dir, '**', '*.pug')
      });

  return function () {
    return $.watch(files, tasks.seq.pug);
  }
}

// -----------------------------------------------------------------------------
// Watch Assets

function watchAssets() {
  var files = pjoin('src', 'assets', '**', '*');
  return function () {
    return $.watch(files, tasks.seq.assets)
  }
}

// -----------------------------------------------------------------------------
// Watch Stylus

function watchStylus() {
  var root = 'src',
      dirs = ['blocks', 'stylus'],
      files = dirs.map(function(dir) {
        return pjoin(root, dir, '**', '*.styl')
      });
  return function () {
    // TODO: separate
    return $.watch(files, function() {
      runSequence('compile:stylus')
    })
  }
}

// -----------------------------------------------------------------------------
// Block --- Generate empty block under src/blocks
//
// Options:
//   --name, -n    Block name [string]

function block(cb) {
  console.log('---------- Generate Block')
  var optionDefinitions = [
    { name: 'gulp-task-name', type: String,  defaultOption: true },
    { name: 'name', type: String, alias: 'n' }
  ];
  var args = cliargs(optionDefinitions);

  if (args['gulp-task-name'] === 'block' && args.name) {
    generateBlock(pjoin('src', 'blocks'), args.name);
  }
  cb()
}

// -----------------------------------------------------------------------------
// Compile Stylus --- retrun stylus compilation task callback

function CompileStylus() {

  // Disable or enable plugins;
  var use = {
    autoprefixer: true,
    debug: true,
    dest: true,
    plumber: true,
    rename: true,
    sourcemap: false,
    stylus: true,
    sync: true
  }

  // Plugins options
  var options = {
    files: pjoin('src', 'stylus', 'main.styl'),
    dest: pjoin('public', 'css'),
    debug: {title: 'Stylus: '},
    stylus: {
      'include css': true,
      use: stylusBemSugar()
    },
    sync: { 'reload after': 250},
    rename: { dirname: '.' },
    sourcemap: {
      write: {
        includeContent: false,
        // As server serve also from `src`
        // redefine origin root to serve `.styl`
        // files as localhost:3000/stylus/<file>
        // This alow directly edit files in Chrome,
        // if project addet to workspace.
        // use this when includeContent is set to false
        sourceRoot: '/stylus'
      }
    },
    autoprefixer: {
      browsers: ['last 2 versions', 'ie >= 9'],
      cascade: false
    }
  };

  // Inject -- inject css to browser.
  // Reload browsers after n-th func call.
  // The amount of calls before reloading
  // controled by `reload after` option.
  // Browser reloading ensure correct css rendering.
  function Inject() {

    var counter = options.sync['reload after'];
    var left = counter;
    return function () {
      if (left-- === 0) {
        left = counter;
        sync.reload()
      }
      log('reload after:', left)
      return sync.stream();
    }
  }

  var inject = Inject();

  return function() {
    console.log('---------- Stylus')
    var compile     = use.stylus ? $.stylus(options.stylus) : noop(),
        catchErrors = use.plumber ? $.plumber() : noop(),
        rename      = use.rename ? $.rename(options.rename) : noop(),
        report      = use.debug ? $.debug(options.debug) : noop(),
        startMap    = use.sourcemap ? $.sourcemaps.init() : noop(),
        endMap      = use.sourcemap ? $.sourcemaps.write('', options.sourcemap.write) : noop(),
        write       = use.dest ? gulp.dest(options.dest) : noop(),
        addPrefixes = use.autoprefixer ? $.autoprefixer(options.autoprefixer) : noop(),
        // this step should be called, to produce strema
        dispatch    = use.sync && global.isWatch ? inject() : noop();
    return gulp.src(options.files)
      .pipe(catchErrors)
      .pipe(startMap)
      .pipe(compile)
      .pipe(addPrefixes)
      .pipe(rename)
      .pipe(endMap)
      .pipe(write)
      .pipe(report)
      .pipe(dispatch)
  }

};

// -----------------------------------------------------------------------------
// Compile Pug --- return pug compilation task callback

function CompilePug() {

  // Disable or enable plugins;
  var use = {
    cached: true,
    debug: true,
    dest: true,
    filter: true,
    jsbeautifier: true,
    newer: true,
    posthtml: true,
    plumber: true,
    pug: true,
    pugInheritance: true,
    rename: true,
    reporter: false,
  }

  // Plugins options
  var options = {
    files: pjoin('src', '**', '*.pug'),
    dest: pjoin('public'),
    debug: {title: 'Pug: '},
    pug: {
      basedir: pjoin(__dirname, 'src'),
      data: {
        projectName: pkg.name,
        jsv0: 'javascript:void(0)',
        getdata: function(file) {
          return getData(pjoin(__dirname, 'src', 'data'), file)
        }
      }
    },
    pugInheritance: {
      basedir: 'src',
      skip: 'node_modules'
    },
    rename: { dirname: '.' },
    filter: [ pjoin('src', 'pages', '**', '*.pug') ],
    cached: 'pug',
    postHtmlBEMSugar: {
      blockPrefix: 'b_',
      elemPrefix: 'e_',
      modPrefix: 'm_',
      modDelim: '_'
    },
    postHtmlBEM: {
      elemPrefix: '__',
      modPrefix: '--',
      modDlmtr: '_'
    },
    jsbeautifier: {
      extra_liners: [],
      indent_inner_html: true,
      indent_size: 2,
      preserve_newlines: true,
      unformatted: []
    },
    newer: {
      dest: 'public',
      ext: '.html',
      map: function(relpath) {
        return path.basename(relpath);
      }
    }
  }

  // excludeIndex -- exclude front page from
  // plugin `plugin` when watching
  function excludeIndex(plugin) {
    result = $.if(function(file) {
      return global.isWatch && !/pages[\\\/]index.pug/.test(file.path);
    }, plugin);
    return result;
  }


  return function () {
    console.log('---------- Pug')
    var cached        = use.cached ? excludeIndex($.cached(options.cached)) : noop(),
        catchErrors   = use.plumber ? $.plumber() : noop(),
        compile       = use.pug ? ($.pug(options.pug)) : noop(),
        findPages     = use.pugInheritance && global.isWatch ? $.pugInheritance(options.pugInheritance) : noop(),
        logBeautified = use.reporter ? $.jsbeautifier.reporter() : noop(),
        onlyNew       = use.newer ? excludeIndex($.newer(options.newer)) : noop(),
        onlyPages     = use.filter ? $.filter(options.filter) : noop(),
        posthtml      = use.posthtml ? $.posthtml([ postHtmlBEMSugar(options.postHtmlBEMSugar), postHtmlBEM(options.postHtmlBEM) ]) : noop(),
        prettify      = use.jsbeautifier ? $.jsbeautifier(options.jsbeautifier) : noop(),
        rename        = use.rename ? $.rename(options.rename) : noop(),
        report        = use.debug ? $.debug(options.debug) : noop(),
        write         = use.dest ? gulp.dest(options.dest) : noop();
    return gulp.src(options.files)
      .pipe(catchErrors)
      .pipe(onlyNew)              // exclude untouched pages from stream
      .pipe(cached)               // exclude unchanged blocks
      .pipe(findPages)            // find pages that depend on changed blocks
      .pipe(onlyPages)            // exclude all blocks
      .pipe(compile)              // compile pug to html
      .pipe(posthtml)             // translate BEM nodes
      .pipe(prettify)
      .pipe(report)               // print compiled files
      .pipe(rename)
      .pipe(write)
  }

};

// -----------------------------------------------------------------------------
// Copy Assets --- just copy files from src/assets/ to public/

function copyAssets() {
  var files = pjoin('src', 'assets', '**', '*'),
      write = gulp.dest(pjoin('public')),
      report = $.debug({ title: 'Assets copied: ', showFiles: false});
  return gulp.src(files)
    .pipe(report)
    .pipe(write)
}

// -----------------------------------------------------------------------------
// Server --- server setup function

function server() {
  sync.init({
    reloadOnRestart: true,
    ghostMode: { scroll: true },
    notify: false,
    server: [ 'public', 'src' ],
    open: false,
    port: 3000,
    socket: { domain: 'localhost:3000' }
  });
};

// -----------------------------------------------------------------------------
// Parse Pages Dir -- parse `pages` dir and buidl file tree in json

function parsePagesDir(cb) {
  var dirpath  = pjoin(__dirname, 'src', 'pages');
  var destpath = pjoin(__dirname, 'src', 'data', 'pages.json');
  var data     = dirtreeSync(dirpath);
  var jsondata = JSON.stringify(data, null, '  ');
  var file     = fs.openSync(destpath, 'w');
  fs.writeSync(file, jsondata);
  fs.closeSync(file);
  cb && cb();
};

// -----------------------------------------------------------------------------
// Reload --- reload connected browsers

function reload(cb) {
  sync.reload();
  cb()
}

// -----------------------------------------------------------------------------
// Log Plugins --- log loaded plugins

function logPlugins(cb) {
  console.log($);
  cb();
}

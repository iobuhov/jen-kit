// -----------------------------------------------------------------------------
// gulpfile.js --- Jen-kit gulp configuration file
//
// Copyright (c) 2017 Ilya Obuhov
//
// Author: Ilya Obuhov <iobuhov.mail@gmail.com>
// URL: https://github.com/iobuhov
//
// -----------------------------------------------------------------------------
// Available tasks:
//
// block -n <block>     - BEM Block scaffolding
// compile:stylus       - Stylus files compilation
// compile:pug          - Pug files compilation
// copy:assets          - Copy static assets to `public/`
// parse:pages          - Parse `pages/` and build file listing in JSON
// plugins              - Print loaded plugins
// reload               - Reload connected browsers
// seq:assets           - copy:assets, then reload
// seq:pug              - parse:pages, compile:pug, then reload
// seq:server           - Do all compilation, setup watchers, start BS server
// seq:watch            - Setup watchers
// server               - Start BS server
// watch:assets         - Watch `src/assets`
// watch:pug            - Watch pug files
// watch:stylus         - Watch styl files
//
// -----------------------------------------------------------------------------
// Modules
//
// browser-sync         - Live CSS Reload & Browser Syncing
// command-line-args    - Feature-complete library to parse command-line options
// gulp                 - The streaming build system
// gulp-autoprefixer    - Prefix CSS
// gulp-cached          - A simple in-memory file cache for Gulp
// gulp-debug           - Debug Vinyl file streams
// gulp-filter          - Filter files in a Vinyl stream
// gulp-if              - Conditionally run a task
// gulp-jsbeautifier    - HTML/CSS/JavaScript formating tool
// gulp-load-plugins    - Automatically load Gulp plugins
// gulp-newer           - Only pass through newer source files
// gulp-plumber         - Prevent pipe breaking from errors
// gulp-posthtml        - PostHTML plugin for Gulp
// gulp-print           - Prints files in a Vinyl stream
// gulp-pug             - Pug plugin for Gulp
// gulp-pug-inheritance - Rebuild only changed pug files and all it dependencies
// gulp-rename          - Rename files
// gulp-sourcemaps      - Source map support for Gulp
// gulp-util            - Utility functions
// gulp-stylus          - Stylus plugin for Gulp
// gulp-watch           - Watch stream
// browser-sync         - Sync compiled files with browser
// posthtml-bem         - BEM-style syntax plugin for PostHTML postprocessor
// posthtml-bem-sugar   - Simplify BEM naming structure in jade/pug
// run-sequence         - Run a series of dependent Gulp tasks in order
// stylus-bem-sugar     - Stylus mixins that help write code in BEM notation
// utils                - Jen-kit utility functions
//
// -----------------------------------------------------------------------------

var gulp             = require('gulp'),
    $                = require('gulp-load-plugins')(),
    cliargs          = require('command-line-args'),
    gutil            = require('gulp-util'),
    postHtmlBEM      = require('posthtml-bem'),
    postHtmlBEMSugar = require('posthtml-bem-sugar'),
    runSequence      = require('run-sequence'),
    stylus           = require('stylus'),
    stylusBemSugar   = require('stylus-bem-sugar'),
    sync             = require('browser-sync').create(),
    fs               = require('fs'),
    path             = require('path'),
    utils            = require('./utils'),
    pkg              = require('./package.json');

// Module locals

var log              = gutil.log.bind(gutil),
    noop             = gutil.noop.bind(gutil),
    pjoin            = path.join.bind(path),
    dirtreeSync      = utils.dirtreeSync,
    generateBlock    = utils.generateBlock,
    getData          = utils.getdata;

// -----------------------------------------------------------------------------
// Gulp Tasks Declaration

var tasks = {// keep refs for all task callbacks

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
gulp.task('copy:assets'     , tasks.copy.assets);
gulp.task('default'         , tasks.seq.server);
gulp.task('parse:pages'     , tasks.parse.pages);
gulp.task('plugins'         , tasks.plugins);
gulp.task('reload'          , tasks.reload);
gulp.task('seq:assets'      , tasks.seq.assets);
gulp.task('seq:pug'         , tasks.seq.pug);
gulp.task('seq:server'      , tasks.seq.server);
gulp.task('seq:watch'       , tasks.seq.watch);
gulp.task('server'          , tasks.server);
gulp.task('watch:assets'    , tasks.watch.assets);
gulp.task('watch:pug'       , tasks.watch.pug);
gulp.task('watch:stylus'    , tasks.watch.stylus);

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
// Server sequence

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
    sync: true,
    group: true
  }

  // Plugins options
  var options = {
    files: pjoin('src', 'stylus', 'main.styl'),
    dest: pjoin('public', 'css'),
    debug: {title: 'Stylus: '},
    stylus: {
      paths: [pjoin(__dirname, 'public', 'images')],
      'include css': true,
      use: stylusBemSugar({
        elementPrefix: "__",
        modifierPrefix: "_",
        modifierDelimiter: "_",
      }),
      define: {
        'url': stylus.url({paths: [pjoin(__dirname, 'public')]}),
        'img': function(filename) {
          return pjoin('images', filename.val);
        }
      }
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
    var compile     = use.stylus ?
          $.stylus(options.stylus) : noop(),
        catchErrors = use.plumber ?
          $.plumber() : noop(),
        rename      = use.rename ?
          $.rename(options.rename) : noop(),
        report      = use.debug ?
          $.debug(options.debug) : noop(),
        startMap    = use.sourcemap ?
          $.sourcemaps.init() : noop(),
        endMap      = use.sourcemap ?
          $.sourcemaps.write('', options.sourcemap.write) : noop(),
        write       = use.dest ?
          gulp.dest(options.dest) : noop(),
        addPrefixes = use.autoprefixer ?
          $.autoprefixer(options.autoprefixer) : noop(),
        groupMedia  = use.group ?
          $.groupCssMediaQueries() : noop(),
        dispatch    = use.sync && global.isWatch ?
          inject() : noop();

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

  // Disable or enable plugins
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
        imgroot: 'images',
        jsv0: 'javascript:void(0)',
        getdata: function(file) {
          return getData(pjoin(__dirname, 'src', 'data'), file)
        },
        blockData: function(block) {
          return getData(pjoin(__dirname, 'src', 'blocks', block), block)
        },
        imgr: function(file) {
          return pjoin(options.pug.data.imgroot, file)
        },
        getArgs: getArgs,
        range: range
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
      modPrefix: '_',
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
    var cached        = use.cached ?
          excludeIndex($.cached(options.cached)) : noop(),
        catchErrors   = use.plumber ?
          $.plumber() : noop(),
        compile       = use.pug ?
          $($.pug(options.pug)) : noop(),
        findPages     = use.pugInheritance && global.isWatch ?
          $.pugInheritance(options.pugInheritance) : noop(),
        logBeautified = use.reporter ?
          $.jsbeautifier.reporter() : noop(),
        onlyNew       = use.newer ?
          excludeIndex($.newer(options.newer)) : noop(),
        onlyPages     = use.filter ?
          $.filter(options.filter) : noop(),
        posthtml      = use.posthtml ?
          $.posthtml([
            postHtmlBEMSugar(options.postHtmlBEMSugar),
            postHtmlBEM(options.postHtmlBEM)
          ]) : noop(),
        prettify      = use.jsbeautifier ?
          $.jsbeautifier(options.jsbeautifier) : noop(),
        rename        = use.rename ?
          $.rename(options.rename) : noop(),
        report        = use.debug ?
          $.debug(options.debug) : noop(),
        write         = use.dest ?
          gulp.dest(options.dest) : noop();

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

// -----------------------------------------------------------------------------
// Generate Block -- generate block dir and files
//
// Parms:
// {dir:string} - the path of the block directory.
// {name:string} - block name.
// {types:array} - array of file extensions to be generated in block.

function generateBlock(dir, name, types) {

  var fs        = require('fs');
  var path      = require('path');
  var gutil     = require('gulp-util');
  var bt        = require('./block-template.js')
  var files;

  types = types && types.length > 0 ? types : ['.pug', '.styl'];
  dir   = path.join(path.resolve(dir), name);
  files = types.map(function(ext) {
    return path.format({
      dir: dir,
      base: name + ext
    })
  });
  fs.mkdirSync(dir, 0755);
  gutil.log(
    gutil.colors.cyan('Created:'),
    gutil.colors.magenta(path.basename(dir)  + path.sep)
  );
  files.forEach(function(file) {
    var fd = fs.openSync(file, 'wx');
    //TODO: Separate logic!
    // ==============================
    if ((/\.pug$/).test(file)) {
      fs.writeFileSync(file, bt('b_', name));
    }
    // ==============================
    fs.closeSync(fd);
    gutil.log(
      gutil.colors.cyan('Created:'),
      gutil.colors.magenta(path.basename(file))
    );
  });
}

module.exports = generateBlock;

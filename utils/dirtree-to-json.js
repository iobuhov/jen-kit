//--------------------------------------------------
// Dirtree
var path = require('path');
var fs   = require('fs');
var cwd  = process.cwd();

// Dirtree -- recursively scan directory and retruns content as json.
// @atr fpath    {string} -- directory path.
// @atr parent      {object} -- object representing parent dir.
// @atr callback {function}

function dirtree(fpath, parent, index, callback) {
  var fpathType  = typeof fpath;
  var parentType = parent !== null && typeof parent === 'object';
  var filesCount = 0;
  var cbCount    = 0;
  var currentdir = {
    name:    path.basename(fpath),
    type:    'dir',
    content: []
  };

  if (fpathType !== 'string') {
    throw new TypeError('Path must be a string, but got ' + fpathType);
  }
  if (!parentType) {
    throw new TypeError('Parent directory must be a object, but got ' + parent.toString());
  }

  // Scan
  // @atr fpath {string} -- filepath
  // @atr stats {fs.Stats} -- file stats object
  // @atr index {number} -- file index in dir
  // @atr parentdir {object} -- parent directory
  // @atr callback {function} -- end function
  function scan(fpath, stats, index, parentdir, callback) {
    var file;
    var argt = {
      fpath : typeof fpath,
      stats : stats && stats instanceof fs.Stats
    };
    if (argt.fpath !== 'string') {
      throw new TypeError('Path must be a string, but got ' + argt.fpath);
    }
    if (!argt.stats) {
      throw new TypeError('Stats must be a fs.Stats object, but got ' + stats.toString());
    }
    if (stats.isDirectory()) {
      file = {
        name: path.basename(fpath),
        type: 'dir',
        content: []
      };
      dir.content[index] = file
      dirtree(fpath, file, cb)
    }
  }
  // get real dir path
  function realpathCb(err, resolvedPath) {
    if (err) throw err;
    console.log(resolvedPath);
    // read dir content
    fs.readdir(resolvedPath, function(err, files) {
      if (err) throw err;
      // if no files, call cb
      if (files.length === 0) {
        callback();
      }
      // save number of files in current dir
      filesCount = files.length;
      // loop through dir files
      files.forEach(function(file, index) {
        // absolute path of file
        var filepath = path.join(resolvedPath, file);
        // get file stats, needed to define file type
        fs.stat(filepath, function(err, stats) {
          if (err) throw err;
          // Check if is was last file in directory
          function isLast() {
            // Inc number of completed scans
            cbCount += 1;
            if (filesCount === cbCount) {
              callback()
            }
          }
          // begin scanning
          scan(filepath, stats, );
        });

      });

    });

  }
  fs.realpath(fpath, realpathCb);
}

module.exports = dirtree;

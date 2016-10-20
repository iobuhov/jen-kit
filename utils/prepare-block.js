// --------------------------------------------------
// Prepare block

function prepareBlock(dir, name, types) {
  var fs   = require('fs');
  var path = require('path');
  var files;
  types = types && types.length > 0 ? types : ['.jade', '.styl'];
  dir   = path.join(path.resolve(dir), name);
  files = types.map(function(ext) {
    return path.format({
      dir: dir,
      base: name + ext
    })
  });
  fs.mkdirSync(dir, 0755);
  console.log(dir, ' was created');
  files.forEach(function(file) {
    fs.closeSync(fs.openSync(file, 'wx'));
    console.log(file, ' was created');
  });
}

module.exports = prepareBlock;

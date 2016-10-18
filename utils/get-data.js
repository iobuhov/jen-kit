// --------------------------------------------------
// Get data
// taked from CSSSR project.

function getdata(dirpath, filepath) {
  var path = require('path');
  var fs   = require('fs');

  dirpath  = path.resolve(dirpath);
  filepath = /\.json$/.test(filepath) ? filepath : filepath + '.json';
  filepath = path.resolve(path.join(dirpath, filepath));
  if (dirpath !== filepath.slice(0, dirpath.length)) {
    throw new Error('Data path is not in data directory. Abort due potential data disclosure.');
  }
  return JSON.parse(fs.readFileSync(filepath));
}

module.exports = getdata;


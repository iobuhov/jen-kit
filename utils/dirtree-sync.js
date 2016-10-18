// --------------------------------------------------
// Dirtree Sync

function dirtreeSync(dir) {
  var path = require('path');
  var fs   = require('fs');
  var absdir = fs.realpathSync(dir);
  function scan(p) {
    if (p[0] === '.') return {
        name: p,
        type: 'file',
    }
    if (p === 'node_modules') return {
        name: p,
        type: 'file',
    }
    var stats = fs.statSync(path.join(absdir, p));
    if (stats.isDirectory()) {
      return dirtreeSync(path.join(absdir, p))
    } else if (stats.isFile()) {
      return {
        name: p,
        type: 'file',
      }
    } else {
      return {}
    }
  }
  return {
    name: path.basename(absdir),
    type: 'dir',
    content: fs.readdirSync(absdir).map(scan)
  }
}
module.exports = dirtreeSync;

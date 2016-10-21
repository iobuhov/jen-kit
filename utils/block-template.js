// --------------------------------------------------
// BEM Block-mixin template

function blockTemplate(prefix, name) {
  template = 'mixin ' + name + '\n' +
             '  .' + prefix + name + '&attributes(attributes)'
  return template;
}

module.exports = blockTemplate;

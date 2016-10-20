'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var R = require('ramda');

var getClassList = exports.getClassList = R.pipe(R.unless(R.is(String), function () {
  throw new Error('getClassList argument should be a string');
}), R.split(' '), R.reject(R.equals('')));

var startWith = exports.startWith = R.uncurryN(2, function (str) {
  return R.pipe(R.take(str.length), R.equals(str));
});

var slicePrefix = R.uncurryN(3, function (prefixProp) {
  return function (config) {
    return R.slice(config[prefixProp].length, Infinity);
  };
});

var process = R.curry(function (_ref, config, node) {
  var prefixProp = _ref.prefixProp;
  var attr = _ref.attr;
  var _ref$processClass = _ref.processClass;
  var processClass = _ref$processClass === undefined ? slicePrefix(prefixProp) : _ref$processClass;

  if (!node.attrs.class) return node;

  var classList = getClassList(node.attrs.class);
  var isClassToProcess = startWith(config[prefixProp]);

  var getProcessedClass = R.pipe(R.filter(isClassToProcess), R.map(processClass(config)), R.join(' '));

  var classWithoutPrefix = getProcessedClass(classList);
  if (!classWithoutPrefix) return node;

  var newClassList = R.reject(isClassToProcess, classList);

  return R.pipe(R.assocPath(['attrs', attr], classWithoutPrefix), newClassList.length ? R.assocPath(['attrs', 'class'], R.join(' ', newClassList)) : R.dissocPath(['attrs', 'class']))(node);
});

var processBlock = exports.processBlock = process({
  prefixProp: 'blockPrefix',
  attr: 'block'
});

var processElement = exports.processElement = process({
  prefixProp: 'elemPrefix',
  attr: 'elem'
});

var getModValuePair = function getModValuePair(mod, value) {
  return R.pipe(R.filter(R.identity), R.join(':'))([mod, value]);
};

var processMods = exports.processMods = process({
  prefixProp: 'modPrefix',
  attr: 'mods',
  processClass: function processClass(config) {
    return function (className) {
      var classWithoutPrefix = slicePrefix('modPrefix', config, className);

      var _R$split = R.split(config.modDlmtr, classWithoutPrefix);

      var _R$split2 = _slicedToArray(_R$split, 2);

      var mod = _R$split2[0];
      var value = _R$split2[1];

      return getModValuePair(mod, value);
    };
  }
});

var defaultConfig = {
  blockPrefix: '-',
  elemPrefix: '__',
  modPrefix: '_',
  modDlmtr: '_'
};

exports.default = function (config) {
  // eslint-disable-line
  var resultConfig = R.merge(defaultConfig, config);

  return function posthtmlBemSugar(tree) {
    tree.match({ attrs: { class: true } }, R.pipe(processBlock(resultConfig), processElement(resultConfig), processMods(resultConfig)));
    return tree;
  };
};

module.exports = Object.assign(exports.default, exports);

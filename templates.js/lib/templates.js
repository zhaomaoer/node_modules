'use strict';
/*global require, module, self*/

(function(module) {
	var templates = {
			cache: {},
			globals: {}
		},
		helpers = {},
		loader,
		worker;

	var regexes = {
		nestedConditionals: /(?!^)<!-- IF([\s\S]*?)ENDIF[ a-zA-Z0-9\._:]*-->(?!$)/gi,
		conditionalBlock: /[\r\n?\n]*?<!-- ELSE -->[\r\n?\n]*?/,
		conditionalHelper: /<!-- IF function.([\s\S]*?)-->/i,
		innerLoop: /\s*<!-- BEGIN([\s\S]*)END ([\s\S]*?)-->/gi,
		removeTabspace: /^\t*?|^\r\n?\t*?|\t?$|\r\n?\t*?$/g,
		removeWhitespace: /(^[\r\n?|\n]*)|([\r\n\t]*$)/g,
		cleanupEmptyLoops: /\s*<!-- BEGIN([\s\S]*?)END ([\s\S]*?)-->/gi,
		cleanupMissingKeys: /[\r\n]*?[\/]?\{[a-zA-Z0-9\.]+[\r\n]*?\}/g,
		getUndefinedKeys: /<!-- IF[\s!]*([\s\S]*?)[\s]*-->/gi,
		backReferenceFix: /\$+/g,
		escapeBlocks: /<!--([\s\S]*?)-->/g,
		escapeKeys: /\{([\s\S]*?)\}/g,
	};

	if (typeof self !== 'undefined' && self.addEventListener) {
		self.addEventListener('message', function(ev) {
			var data = ev.data;

			self.postMessage({
				result: !data.block ? templates.parse(data.template, data.object) : templates.parse(data.template, data.block, data.object),
				signature: data.signature
			}, '*');
		}, false);
	}

	var callbacks = {},
		signature = 0,
		MAX_SAFE_INT = Math.pow(2, 53) - 1;

	templates.setupWebWorker = function(pathToScript) {
		try {
			worker = new Worker(pathToScript);

			worker.addEventListener('message', function(e) {
				if (callbacks[e.data.signature]) {
					callbacks[e.data.signature](e.data.result);
				}
			}, false);
		} catch (err) {}
	};

	function launchWorker(template, obj, block, callback) {
		signature++;
		if (signature > MAX_SAFE_INT) {
			signature = 0;
		}

		obj = sanitise(obj);

		worker.postMessage({
			template: template,
			object: obj,
			block: block,
			signature: signature
		});

		callbacks[signature] = function(result) {
			callback(result);
			delete callbacks[signature];
		};
	}

	function sanitise(obj) {
		for(var prop in obj) {
			if (!obj.hasOwnProperty(prop) || typeof obj[prop] === 'function') {
				delete obj[prop];
			}
		}

		return obj;
	}

	templates.parse = function(template, block, obj, callback) {
		if (typeof block !== 'string') {
			callback = obj;
			obj = block;
			block = false;
		}
		
		if (!template) {
			return callback ? callback('') : '';
		}
		
		obj = registerGlobals(obj || {});

		if (loader && callback) {
			if (!templates.cache[template]) {
				loader(template, function(loaded) {
					templates.cache[template] = loaded;

					launchCallback(loaded, obj, block, callback);
				});
			} else {
				launchCallback(templates.cache[template], obj, block, callback);
			}
		} else if (callback) {
			launchCallback(template, obj, block, callback);
		} else {
			return parseTemplate(block, template, obj);
		}
	};

	function launchCallback(template, obj, block, callback) {
		if (worker) {
			launchWorker(template, obj, block, callback);
		} else {
			callback(parseTemplate(block, template, obj));
		}
	}

	function parseTemplate(block, template, obj) {
		block = !block ? template : templates.getBlock(template, block);
		template = parse(block, obj);

		return parseFunctions(template, template, obj);
	}

	templates.registerHelper = function(name, func) {
		helpers[name] = func;
	};

	templates.registerLoader = function(func) {
		loader = func;
	};

	templates.setGlobal = function(key, value) {
		templates.globals[key] = value;
	};

	templates.getBlock = function(template, block) {
		return template.replace(new RegExp('[\\s\\S]*(<!--[\\s]*BEGIN ' + block + '[\\s]*-->[\\s\\S]*?<!--[\\s]*END ' + block + '[\\s]*-->)[\\s\\S]*', 'g'), '$1');
	};

	templates.flush = function() {
		templates.cache = {};
	};

	function express(filename, options, fn) {
		var fs = require('fs'),
			tpl = filename.replace(options.settings.views + '/', '');

		options._locals = null;

		if (!templates.cache[tpl]) {
			fs.readFile(filename, function(err, html) {
				templates.cache[tpl] = (html || '').toString();
				return fn(err, templates.parse(templates.cache[tpl], options));
			});
		} else {
			return fn(null, templates.parse(templates.cache[tpl], options));
		}
	}

	function replace(string, regex, value) {
		return string.replace(regex, value.toString().replace(regexes.backReferenceFix, '$$$'));
	}

	function replaceValue(template, key, value) {
		var string;

		value = value.toString();
		string = replace(template, new RegExp('{{' + key + '}}', 'g'), value);

		return replace(string, new RegExp('{' + key + '}', 'g'), value
			.replace(regexes.escapeKeys, '&#123;$1&#125;')
			.replace(regexes.escapeBlocks, '&lt;!--$1--&gt;')
		);
	}

	function makeRegex(block, namespace) {
		namespace = '(' + namespace + ')?';
		return new RegExp('[\\t ]*<!--[\\s]*BEGIN ' + namespace + block + '[\\s]*-->[\\s\\S]*?<!--[\\s]*END ' + namespace + block + '[\\s]*-->');
	}

	function makeBlockRegex(block, namespace) {
		namespace = '(' + namespace + ')?';
		return new RegExp('([\\t ]*<!--[\\s]*BEGIN ' + namespace + block + '[\\s]*-->[\\r\\n?|\\n]?)|(<!--[\\s]*END ' + namespace + block + '[\\s]*-->)', 'g');
	}

	function makeConditionalRegex(block) {
		return new RegExp('<!--[\\s]*IF ' + block + '[\\s]*-->([\\s\\S]*?)<!--[\\s]*ENDIF ' + block.split(',')[0] + '[\\s]*-->', 'g');
	}

	function makeStatementRegex(key) {
		return new RegExp('(<!--[\\s]*IF ' + key + '[\\s]*-->)|(<!--[\\s]*ENDIF ' + key.split(',')[0] + '[\\s]*-->)', 'g');
	}

	function registerGlobals(obj) {
		for (var g in templates.globals) {
			if (templates.globals.hasOwnProperty(g)) {
				obj[g] = obj[g] || templates.globals[g];
			}
		}

		return obj;
	}

	function checkConditionals(template, key, value) {
		return checkConditional(checkConditional(template, '!' + key, !value), key, value);
	}

	function checkConditional(template, key, value) {
		var matches = template.match(makeConditionalRegex(key));

		if (matches !== null) {
			for (var i = 0, ii = matches.length; i < ii; i++) {
				var statement = makeStatementRegex(key),
					nestedConditionals = matches[i].match(regexes.nestedConditionals),
					match = replace(matches[i].replace(statement, ''), regexes.nestedConditionals, '<!-- NESTED -->'),
					conditionalBlock = match.split(regexes.conditionalBlock);

				if (conditionalBlock[1]) {
					// there is an else statement
					template = replace(template, matches[i], replace(conditionalBlock[value ? 0 : 1], regexes.removeWhitespace, ''));
				} else {
					// regular if statement
					template = replace(template, matches[i], value ? replace(match, regexes.removeWhitespace, '') : '');
				}

				if (nestedConditionals) {
					for (var x = 0, xx = nestedConditionals.length; x < xx; x++) {
						template = replace(template, '<!-- NESTED -->', nestedConditionals[x]);
					}
				}
			}
		}

		return template;
	}

	function checkConditionalHelpers(template, obj) {
		var string,
			func;


		while ((string = template.match(regexes.conditionalHelper)) !== null) {
			var fn = string[1].trim(),
				args = fn.split(/[ ]*,[ ]*/);

			func = args[0];

			if (helpers[func]) {
				args.shift();
				args.unshift(obj);
				template = checkConditionals(template, 'function.' + fn, helpers[func].apply(null, args));
			} else {
				template = template.replace(makeConditionalRegex('function.' + fn));
			}
		}

		return template;
	}

	function callMethod(method, parameters) {
		return method.apply(templates, parameters);
	}

	function parseFunctions(block, result, obj) {
		var functions = block.match(/{function.*?}/gi, '');
		if (!functions) {
			return result;
		}

		for (var i=0, ii=functions.length; i<ii; ++i) {
			var search = functions[i],
				fn = functions[i].replace('{function.', '').split('}').shift().split(/[ ]*,[ ]*/),
				method = fn.shift(),
				parameters = [];

			if (fn.length) {
				for (var j = 0, jj = fn.length; j < jj; j++) {
					parameters.push(obj[fn[j]]);
				}
			} else {
				parameters = [obj];
			}

			if (helpers[method]) {
				result = replace(result, new RegExp(search, 'gi'), callMethod(helpers[method], parameters));
			}
		}

		return result;
	}

	function parseObject(template, array, key, namespace) {
		return parseArray(template, array, key, namespace, true);
	}

	function parseArray(template, array, key, namespace, isObject) {
		template = checkConditionals(template, namespace  + key + '.length', array[key].length);

		var regex = makeRegex(key, namespace), block, result;

		if (!array[key].length && !isObject) {
			return template.replace(regex, '');
		}

		while ((block = template.match(regex)) !== null) {
			block = block[0].replace(makeBlockRegex(key, namespace), '');

			var innerLoops = block.match(regexes.innerLoop);

			block = block
				.replace(regexes.innerLoop, '<!-- INNER LOOP -->')
				.replace(/\{\.\.\/([\S]*?)\}/g, '{' + namespace + key + '.$1}')
				.replace(/IF \.\.\/([\S]*?)/g, 'IF ' + namespace + key + '.$1')
				.replace(/IF !\.\.\/([\S]*?)/g, 'IF !' + namespace + key + '.$1');

			if (innerLoops) {
				for (var x = 0, xx = innerLoops.length; x < xx; x++) {
					block = replace(block, '<!-- INNER LOOP -->', innerLoops[x]);
				}
			}

			block = block
					.replace(regexes.removeTabspace, '');

			result = parseArrayBlock(block, array[key], namespace + key + '.', isObject);

			template = replace(template, regex, result.replace(regexes.removeWhitespace, ''));
		}

		return template;
	}

	function parseArrayBlock(block, array, namespace, isObject) {
		var numblocks = array.length - 1,
			template = '';

		for (var iterator in array) {
			if (array.hasOwnProperty(iterator)) {
				var result = '';

				if (!isObject) {
					iterator = parseInt(iterator, 10);
				}

				result += parse(block, array[iterator], namespace);

				if (!isObject) {
					result = checkConditionals(result, '@first', iterator === 0);
					result = checkConditionals(result, '@last', iterator === numblocks);

					result = result.replace(/@index/g, iterator);
					result = result.replace(/@value/g, array[iterator]);
				} else {
					result = result
						.replace(/@key/g, iterator)
						.replace(/@value/g, array[iterator]);
				}

				result = parseFunctions(block, result, array[iterator]);
				template = template + result;
			}
		}

		return template;
	}

	function parseValue(template, key, value) {
		template = checkConditionals(template, key, value);
		return replaceValue(template, key, value);
	}

	function parse(template, obj, namespace) {
		namespace = namespace || '';

		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (typeof obj[key] === 'undefined' || typeof obj[key] === 'function' || !template.match(key)) {
					continue;
				} else if (obj[key] === null) {
					template = replaceValue(template, namespace + key, '');
				} else if (obj[key].constructor === Array) {
					template = replaceValue(template, namespace + key + '.length', obj[key].length);
					template = parseArray(template, obj, key, namespace);
				} else if (obj[key] instanceof Object) {
					template = parseObject(template, obj, key, namespace);
					template = checkConditionals(template, key, obj[key]);
					template = parse(template, obj[key], namespace + key + '.');
				} else {
					template = parseValue(template, namespace + key, obj[key]);	
				}
			}
		}

		if (namespace) {
			namespace = '';
		} else {
			template = checkConditionalHelpers(template, obj);
			template = cleanup(template);
		}

		return template;
	}

	function cleanup(template) {
		var missingKey;

		template = template
			.replace(regexes.cleanupEmptyLoops, '');

		var temp = template;
		while ((missingKey = regexes.cleanupMissingKeys.exec(template)) !== null) {
			if (missingKey[0].substr(0, 1) !== '/') {
				temp = temp.replace(missingKey[0], '');
			} else {
				temp = temp.replace(missingKey[0], missingKey[0].slice(1));
			}
		}

		template = temp;

		var undefinedKey,
			undefinedKeys = {},
			parseUndefined;

		while ((undefinedKey = regexes.getUndefinedKeys.exec(template)) !== null) {
			if (template.match(new RegExp('<!--\\s*?ENDIF[\\s!]*' + undefinedKey[1] + '\\s*?-->'))) {
				undefinedKeys[undefinedKey[1]] = false;
				parseUndefined = true;
			}
		}

		return parseUndefined ? parse(template, undefinedKeys, '') : template;
	}

	module.exports = templates;
	module.exports.__express = express;

	if ('undefined' !== typeof window) {
		window.templates = module.exports;
	}

})('undefined' === typeof module ? {
	module: {
		exports: {}
	}
} : module);

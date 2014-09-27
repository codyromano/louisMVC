/** 
* @author Cody Romano 
*/
(function () {
	'use strict';

	var Lou = window.Lou = {}, Util = {}; // Core classes and utilities	

	// A general method for rate-limiting any process. Lou.MVC uses this 
	// to schedule performance-intensive DOM manipulation  
	Util.rateLimit = (function () {
		var processes = {}; 

		/** 
		* @param {String} A unique identifier describing a group of processes.
		* @param {Function} A callback to be executed in a queue. 
		* @param {Integer} Milliseconds that must pass between function calls.
		*/
		return function (pID, fn, rateLimit) {
			var process = processes[pID]; 

			if (!process) {
				process = processes[pID] = {stack: [], polling: false, time: null};
			}
			process.stack.push(fn); 

			if (!process.polling) {
				(function pollingCycle () {
					var nowTime = (new Date).getTime();

					if (process.stack.length == 0) {
						process.polling = false; 
						return false; 
					}

					if (!process.time || nowTime - process.time >= rateLimit) {
						process.time = nowTime; 
						process.stack[0](); 
						process.stack.slice(0,1); // Run then remove callback
					} else {
						setTimeout(pollingCycle, 100); 
					}
				})(); 
			}
		};
	})(); 

	Util.getUniqueID = (function () {
		var counter = 0; 
		return function () { return 'id' + (++counter); }
	})();

	// Helpers for iterating through objects and node lists
	Util.forEachInObj = function (obj, doForEach) {
		for (var key in obj) { doForEach(key, obj[key]); }
	};

	Util.isDOMNode = function (data) {
		return typeof data == 'object' && data != null && 
			'innerHTML' in data;  
	};

	Util.forEachNode = function (selector, doForEach) {
		var nodeList = document.querySelectorAll(selector); 
		var nodeArray = Array.prototype.slice.call(nodeList); 
		return nodeArray.map(doForEach); 
	};

	// Call a function if it exists
	Util.maybeCall = function (fn) { if (typeof fn == 'function') { fn(); } };

	Util.isArray = function (data) {
		return typeof data == 'object' && 'push' in data; 
	};

	Lou.Dispatch = (function () {
		var events = {}; 
		return {
			broadcast: function (eventName, params) {
				if (Util.isArray(events[eventName])) {
					events[eventName].forEach(function (fn) { fn(params); });
				}
			},
			listen: function (eventName, callback) {
				if (!Util.isArray(events[eventName])) { events[eventName] = [];}
				events[eventName].push(callback);
			}
		};
	})();

	Lou.Router = (function () {
		var _self = this, pub = {};

		pub.getHash = function () { return location.hash.replace('#',''); };
		pub.goToRoute = function (route) { window.location.hash = route; };

		pub.getRoute = function () {
			var hash = pub.getHash(); 
			return hash.length > 0 ? hash : 'defaultView';
		};

		function handleRouteChange () {
			var route = pub.getRoute(); 
			if (route in Lou) { Lou[route].render(); }
		};

		pub.init = function () {
			handleRouteChange();
			window.addEventListener('hashchange', handleRouteChange); 
		};

		return pub;
	})();

	Lou.MVC = function (params) {
		if (!this.constructor instanceof Lou.MVC) { return new Lou.MVC(params); }

		var _self = this; 

		// Deep clone the model
		var model = JSON.parse(JSON.stringify(params.model));

		// If the optional user-provided initialization function was called. 
		var initWasCalled = false; 

		// Only change _self.el.innerHTML when the template is first
		// rendered. This flag helps us keep track of that
		var didInitialRender = false; 

		// Generate an immutable, unique ID
		Object.defineProperty(_self, 'id', {
			value: Util.getUniqueID(), 
			writable: false
		});

		this.renderRateLimit = 250; 

		// DOM element where rendered content appears
		this.el = params.el;

		if (!Util.isDOMNode(this.el)) {
			throw new TypeError("You didn't provide a valid 'el' attribute. Without this, " + 
				"Lou can't tell where to render.");
		}

		// Keep our actual model in a closure and restrict
		// access using universal getter and setter methods
		_self.model = {}; 

		_self.model.set = function () { 
			var key, newValue, object; 

			switch (arguments.length) {
				// Update multiple properties at once 
				case 1:
					if (typeof arguments[0] == 'object') {
						object = arguments[0];
						Util.forEachInObj(object, function (key, newValue) {
							model[key] = newValue; 
						}); 
					}
				break;
				// Update a single property
				case 2:
					key = arguments[0]; 
					newValue = arguments[1]; 
					if (typeof key == 'string') { model[newValue] = newValue; }
				break;
			}

			// Update the view if the user wants data binding
			if (params.dataBinding != false) {
				Util.rateLimit('SimpleMVCRender', _self.render, 
					_self.renderRateLimit);
			} 
		};

		_self.model.get = function () {
			var args = Array.prototype.slice.call(arguments);

			switch (args.length) {
				// Return the entire model 
				case 0: return model; break; 

				// Return one attribute of the model 
				case 1: return model[args[0]]; break;

				// Return more than one model attribute as an object
				default:
					return args.reduce(function (result, modelKey) {
						if (modelKey in model) { 
							result[modelKey] = model[modelKey]; 
						}
					}, {});
				break;
			}
		};

		// An array of parsed event directives. Each directive 
		// consists of an eventType, a selector and a callback function
		_self.events = (function () {
			var parsedEvents = []; 
			if (typeof params.events != 'object') { return parsedEvents; }

			Util.forEachInObj(params.events, function (key, value) {
				var eventInfoParts = key.trim('').split(' ');

				// Ensure the event description is properly formatted and the 
				// specified callback function exists 
				if (eventInfoParts.length != 2 ||  
					typeof params[value] != 'function') {
					return; 
				}

				parsedEvents.push({
					type: eventInfoParts[0], 
					selector: eventInfoParts[1],
					callback: params[value]
				});
			});

			return parsedEvents; 
		})();

		// A string consisting of HTML
		_self.template = params.template;

		// Optional logic to be executed after each render
		_self.afterRender = null; 

		// Optional logic to be executed after the first render
		_self.init = params.init; 

		if (typeof params.afterRender == 'function') {
			_self.afterRender = params.afterRender.bind(_self); 
		}

		// Map user-provided events to user-provided functions
		_self.toggleEventListeners = function (setting) {
			var listenMethod = setting ? 'addEventListener' : 
				'removeEventListener';

			_self.events.forEach(function (eventInfo) {
				if (eventInfo.selector) {
					// Add a listener to each node 
					Util.forEachNode(eventInfo.selector, function (node) {
						// Pass the DOM element to the function 
						var callback = eventInfo.callback.bind(_self, node);

						// Add an event listener to the node
						node[listenMethod](eventInfo.type, callback);
					});
				}
			});
		};

		_self.render = function () {
			Lou.Dispatch.broadcast('renderMVC', {mvcID: _self.id}); 

			var template = _self.template;
			var elems; 

			if (!didInitialRender) {
				_self.el.innerHTML = template; 
				didInitialRender = true;
			}

			Util.forEachNode('[data-model]', function (node) {
				var modelProperty = node.dataset.model; 

				if (!modelProperty in model) { 
					console.warn("Unknown model property '" + modelProperty + "'");
					return; 
				}
				if (node.hasOwnProperty('innerHTML')) {
					node.innerHTML = _self.model.get(modelProperty); 
				}
				if (node.hasOwnProperty('value')) {
					node.value = _self.model.get(modelProperty); 
				}
				if (node.hasOwnProperty('src')) {
					node.src = _self.model.get(modelProperty); 
				}
			});

			// Turn event listeners on 
			_self.toggleEventListeners(true); 

			// Execute optional logic after each render
			Util.maybeCall(_self.afterRender);

			if (!initWasCalled && typeof params.init == 'function') {
				params.init.call(_self);  
				initWasCalled = true; 
			} 
		};

		Lou.Dispatch.listen('renderMVC', function (params) {
			// If a template other than this object's template is being rendered, 
			// we will need to re-insert HTML into the target element
			if (params.mvcID != _self.id) { didInitialRender = false; }
		});
	}

})(); 

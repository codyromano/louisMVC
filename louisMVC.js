/** 
* @author Cody Romano 
* @copyright 2014
*/
(function () {
	'use strict';

	// General helper functions 
	var Util = Util || {}; 

	// This is a general method for rate-limiting.
	// LouisMVC uses it to manage performance-intensive DOM manipulation.  
	Util.rateLimit = (function () {
		var processes = {}; 

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
						process.stack.slice(0,1);  
					} else {
						setTimeout(pollingCycle, 100); 
					}
				})(); 
			}
		};
	})(); 

	// Like forEach, but for objects
	Util.forEachInObj = function (obj, doForEach) {
		for (var key in obj) { doForEach(key, obj[key]); }
	};

	Util.forEachNode = function (selector, doForEach) {
		var nodeList = document.querySelectorAll(selector); 
		var nodeArray = Array.prototype.slice.call(nodeList); 
		nodeArray.forEach(doForEach); 
	};

	// Call a function if it exists
	Util.maybeCall = function (fn) {
		if (typeof fn == 'function') { fn(); }
	};

	function LouisMVC (params) {
		'use strict';

		if (!this.constructor instanceof LouisMVC) {
			return new LouisMVC(params); 
		}

		var _self = this; 

		// A plain JavaScript object 
		var model = params.model; 

		this.renderRateLimit = 250; 

		// DOM element where rendered content appears
		this.el = params.el;

		// Keep our actual model in a closure and restrict
		// access using universal getter and setter methods
		this.model = {
			set: function (key, value) {
				model[key] = value;
				if (params.dataBinding != false) {
					Util.rateLimit('SimpleMVCRender', _self.render, _self.renderRateLimit);
				} 
			}, 
			get: function (key) {
				return model[key]; 
			}
		};

		var templateHasBeenRendered = (function () {
			var firstRender = true; 
			return function () {
				if (firstRender) {
					firstRender = false; 
					return false; 
				}
				return true; 
			};
		})();

		// An array of parsed event directives. Each directive 
		// consists of an eventType, a selector and a callback function
		this.events = (function () {
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
		this.template = params.template;

		// Optional logic to be executed after each render
		this.afterRender = null; 

		if (typeof params.afterRender == 'function') {
			this.afterRender = params.afterRender.bind(this); 
		}

		// Map user-provided events to user-provided functions
		this.toggleEventListeners = function (setting) {
			var _self = this; 
			var listenMethod = setting ? 'addEventListener' : 
				'removeEventListener';

			this.events.forEach(function (eventInfo) {
				var selectorEl = document.querySelector(eventInfo.selector);

				// Pass the DOM element to the function 
				var callback = eventInfo.callback.bind(_self, selectorEl); 

				if (eventInfo.selector) {
					document.querySelector(eventInfo.selector)
					[listenMethod](eventInfo.type, callback); 
				}
			});
		};

		this.render = function () {
			var template = this.template;
			var elems; 

			if (!templateHasBeenRendered()) {
				this.el.innerHTML = template; 
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
			});

			_self.toggleEventListeners(true); 
			Util.maybeCall(this.afterRender); 
		};
	}

	// Exports 
	window.LouisMVC = LouisMVC; 
})(); 

# LouisMVC
![](http://www.splitsville.com/wp-content/uploads/2014/06/louis-ck-oh-my-god.jpg)

LouisMVC is a minimal MVC framework inspired by Backbone, Angular and, of course, Louis C.K. The framework has to [go to space](https://www.youtube.com/watch?v=KpUNA2nutbk#t=76). Will you give it a second to get back from space?

## Use LouisMVC if...

* You want to organize a simple front-end project 
* A full-fledged framework would be too large and/or complex
* You want zero dependencies

## Getting Started

1. Include `<script src="louisMVC.js"></script>` at the end of your HTML page, before `</body>`. 
2. Create a new instance of the framework and render some content:

  ```javascript
  var myMVC = new LouisMVC({...settings...}); 
  myMVC.render(); 
  ```
## Settings

The object that you pass to `LouisMVC` must include these *four* properties: 

  Property      | Type          | Description
  ------------- | ------------- | -------------
  el            | *DOM Element*   | The place where your rendered template should appear
  template      | *String*        | A string of HTML that will be rendered as a template
  model         | *Object*        | A plain JavaScript object representing your data.
  events        | *Object*        | Allows you to specify events and event handlers. 

The following two properties are *optional*: 

  Property  | Type | Description
  ----------|------|---------------
    dataBinding   | *Boolean*       | When `dataBinding` is `true`, changes to a model will be automatically rendered to the view. This is analogous to one-way binding in Angular. This is optional. When left out, it defaults to `true`.
    afterRender | *Function*  | Additional logic to be executed each time the template is rendered.

## Events

The object that you supply for `events` should follow the format `"event selector" : "callback"`. For example: 

  ```javascript
  events: {
    "keyup #myinput" : "handleInput"
  },
  handleInput: function (input) {
  // Do something 
  }
  ```
You must supply a function to be called for each event. Notice that the relevant DOM element is passed to the handler function for convenience. In the example above, for instance, you might be interested in accessing `input.value`.

## Working with Models

You can access model data using `this.model.set` and `this.model.get`. These methods are available within the event handler functions that you provide. For example: 

```javascript
new LouisMVC({
  model: {
    userName: '', 
  },
  events: {
    'keyup #userName' : 'userNameUpdated'
  }, 
  userNameUpdated: function (input) {
    this.model.set('userName', input.value); 
    console.log("Your name is " + this.model.get('userName')); 
  }
}); 
```

## Example

To demonstrate the framework's data binding feature, let's create a simple joke generator. Use the following HTML:

```HTML
<main></main>

<script id="template" type="text">
	<select id="topic">
		<option value="">Choose a joke topic</option> 
		<option value="eating">Eating</option>
		<option value="menAndWomen">Men and women</option>
	</select>
	<p data-model="joke"></p>
</script>
```
After your HTML, add the following JavaScript: 
  ```javascript
  var jokeMVC = new LouisMVC({
  	// Where the template should be rendered 
  	el: document.querySelector('main'), 
  
  	// A string of HTML 
  	template: document.querySelector('#template').innerHTML,
  
  	// Tell LouisMVC to render the view whenever the model changes
  	dataBinding: true,  
  
  	// All of our data goes here 
  	model: {
  		joke: ""
  	},
  
  	// Listen for changes to the select field 
  	events: {
  		'change #topic' : 'topicChanged'
  	},
  
  	// Provide a callback for whenever the select box changes
  	topicChanged: function (select) {
  		switch (select.value) {
  			case 'eating': 
  				this.model.set("joke", "I finally have the body I want. " + 
  					"It's easy, actually. You just have to want a really sh***y body.");
  			break;
  			case 'menAndWomen': 
  				this.model.set("joke", "I don't think women are better than men; " + 
  					"I just think men are a lot worse than women.");
  			break;
  		}
  	}
  });
  
  // Render the view initially
  jokeMVC.render(); 
  ```

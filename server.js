var express = require('express');
var app = express();
var PORT = process.env.PORT || 3000;
var todos = [{
	id: 1,
	description: 'Pick up Alyssa',
	completed: false
}, {
	id: 2,
	description: 'Laundry',
	completed: false
}, {
	id: 3,
	description: 'Make dinner',
	completed: true
}];

app.get('/', function (req, res) {
	res.send('Todo API Root');
});

app.get('/todos', function(req, res) {
	res.json(todos);
});

app.get('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var found = false;

	todos.forEach(todo => {
		if (todo.id === todoId) {
			found = true;
			res.json(todo);
		}
	});

	if (!found) {
		res.status(404).send();
	}
});

app.listen(PORT, function () {
	console.log('Express listening on port ' + PORT + '!');
});

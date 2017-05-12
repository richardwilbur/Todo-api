var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');

var app = express();
var PORT = process.env.PORT || 3000;
var todos = [];
var todoNextId = 1;

app.use(bodyParser.json());

app.get('/', function (req, res) {
	res.send('Todo API Root');
});

// GET /todos
app.get('/todos', function(req, res) {
	var query = req.query;
	var where = {};

	if (query.hasOwnProperty('completed')) {
		if (query.completed === 'true') {
			where.completed = true;
		} else if (query.completed === 'false') {
			where.completed = false;
		}
	}

	if (query.hasOwnProperty('q')
		&& query.q.length > 0) {
		where.description = {
			$like: `%${query.q}%`
		}
	}

	db.todo.findAll({ where: where }).then(todos => {
		res.json(todos);
	}, error => {
		res.status(500).send();
	});
});

// GET /todos/:id
app.get('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);

	db.todo.findById(todoId).then(todo => {
		if (!!todo) {
			res.json(todo.toJSON());
		} else {
			res.status(404).send();
		}
	}, error => {
		res.status(500).send();
	});
});

// POST /todos
app.post('/todos', function(req, res) {
	var body = _.pick(req.body, 'description', 'completed');

	db.todo.create(body).then(todo => {
		res.json(todo.toJSON());
	}, error => {
		res.status(400).json(error);
	});
});

// DELETE /todos/:id
app.delete('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);

	db.todo.findById(todoId).then(todo => {
		if (!!todo) {
			var options = {
				where: {
					id: todoId
				},
				limit: 1
			};

			db.todo.destroy(options).then(rowsDeleted => {
				if (rowsDeleted === 1) {
					res.json(todo.toJSON());
				} else {
					res.status(500).send();
				}
			}, error => {
				res.status(500).send();
			});
		} else {
			res.status(404).json({ "error": "No todo found with that id" });
		}
	}, error => {
		res.status(500).send();
	});
});

// PUT /todos/:id
app.put('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var matchedTodo = _.findWhere(todos, {id: todoId});
	var body = _.pick(req.body, 'description', 'completed');
	var validAttributes = {};

	if (!matchedTodo) {
		res.status(404).json({ "error": "No todo found with that id" });
	}

	if (body.hasOwnProperty('completed')) {
		if (_.isBoolean(body.completed))  {
			validAttributes.completed = body.completed;
		} else {
			return res.status(400).send();
		}
	}

	if (body.hasOwnProperty('description')) {
		if (_.isString(body.description)
			&& body.description.trim().length > 0)  {
			validAttributes.description = body.description.trim();
		} else {
			return res.status(400).send();
		}
	}

	_.extend(matchedTodo, validAttributes);

	res.json(matchedTodo);
});

db.sequelize.sync().then(function () {
	app.listen(PORT, function () {
		console.log('Express listening on port ' + PORT + '!');
	});
});

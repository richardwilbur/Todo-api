var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var bcrypt = require('bcrypt');
var db = require('./db.js');
var middleware = require('./middleware.js')(db);

var app = express();
var PORT = process.env.PORT || 3000;
var todos = [];
var todoNextId = 1;

app.use(bodyParser.json());

app.get('/', function (req, res) {
	res.send('Todo API Root');
});

// GET /todos
app.get('/todos', middleware.requireAuthentication, function(req, res) {
	var query = req.query;
	var where = {
		userId: req.user.get('id')
	};

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
app.get('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var where = {
		userId: req.user.get('id'),
		id: todoId
	}

	db.todo.findOne({ where: where }).then(todo => {
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
app.post('/todos', middleware.requireAuthentication, function(req, res) {
	var body = _.pick(req.body, 'description', 'completed');

	db.todo.create(body).then(todo => {
		req.user.addTodo(todo).then(function () {
			return todo.reload();
		}).then(todo => {
			res.json(todo.toJSON());
		});
	}, error => {
		res.status(400).json(error);
	});
});

// DELETE /todos/:id
app.delete('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var where = {
		userId: req.user.get('id'),
		id: todoId
	}

	db.todo.findOne({ where: where }).then(todo => {
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
app.put('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var body = _.pick(req.body, 'description', 'completed');
	var attributes = {};
	var where = {
		userId: req.user.get('id'),
		id: todoId
	}

	if (body.hasOwnProperty('completed')) {
		attributes.completed = body.completed;
	}

	if (body.hasOwnProperty('description')) {
		attributes.description = body.description.trim();
	}

	db.todo.findOne({ where: where }).then(todo => {
		if (todo) {
			todo.update(attributes).then(todo => {
				res.json(todo.toJSON());
			}, error => {
				res.status(400).json(error);
			});
		} else {
			res.status(404).json({ "error": "No todo found with that id" });
		}
	}, error => {
		res.status(500).send();
	});
});

// POST /users
app.post('/users', function(req, res) {
	var body = _.pick(req.body, 'email', 'password');

	db.user.create(body).then(user => {
		res.json(user.toPublicJSON());
	}, error => {
		res.status(400).json(error);
	});
});

// POST /users/login
app.post('/users/login', function(req, res) {
	var body = _.pick(req.body, 'email', 'password');
	var userInstance;

	db.user.authenticate(body).then(user => {
		let token = user.generateToken('authentication');
		userInstance = user;

		return db.token.create({
			token: token
		});
	}).then(tokenInstance => {
		res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON());
	}).catch(error => {
		res.status(401).send();
	});
});

// DELETE /users/login
app.delete('/users/login', middleware.requireAuthentication, function(req, res) {
	req.token.destroy().then(function () {
		res.status(204).send();
	}).catch(function () {
		res.status(500).send();
	});
});

db.sequelize.sync({force: true}).then(function () {
	app.listen(PORT, function () {
		console.log('Express listening on port ' + PORT + '!');
	});
});

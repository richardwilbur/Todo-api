module.exports = function (db) {

	return {
		requireAuthentication: function (req, res, next) {
			let token = req.get('Auth');

			db.user.findByToken(token).then(function (user) {
				res.user = user;
				next();
			}, function (error) {
				res.status(401).send();
			});
		}
	}
}
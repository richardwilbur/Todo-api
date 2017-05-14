let bcrypt = require('bcrypt');
let _ = require('underscore');

module.exports = function (sequelize, DataTypes) {
	var user = sequelize.define('user', {
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isEmail: true
			}
		},
		salt: {
			type: DataTypes.STRING
		},
		password_hash: {
			type: DataTypes.STRING
		},
		password: {
			type: DataTypes.VIRTUAL,
			allowNull: false,
			validate: {
				len: [7, 100]
			},
			set: function (value) {
				// generate a random salt string with 10 characters
				let salt = bcrypt.genSaltSync(10);
				let hashedPassword = bcrypt.hashSync(value, salt);

				this.setDataValue('password', value);
				this.setDataValue('salt', salt);
				this.setDataValue('password_hash', hashedPassword);
			}
		}
	}, {
		hooks: {
			beforeValidate: (user, options) => {
				if (typeof user.email === 'string') {
					user.email = user.email.toLowerCase();
				}
			}
		},
		classMethods: {
			authenticate: function (body) {
				return new Promise(function (resolve, reject) {
					if (typeof body.email !== 'string' 
						|| typeof body.password !== 'string') {
						return reject();
					}

					user.findOne({ 
						where: { 
							email: body.email 
						} 
					}).then(user => {
						if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
							return reject();
						}

						resolve(user);

						// if (user) {
						// 	let hashedPassword = bcrypt.hashSync(body.password, user.salt);

						// 	if (hashedPassword === user.password_hash) {
						// 		res.json(user.toPublicJSON());
						// 	} else {
						// 		res.status(401).send();
						// 	}
						// } else {
						// 	res.status(401).send();
						// }
					}, error => {
						reject();
					});
				});
			}
		},
		instanceMethods: {
			toPublicJSON: function () {
				let json = this.toJSON();
				return _.pick(json, 'id', 'email', 'updatedAt', 'createdAt');
			}
		}
	});

	return user;
};

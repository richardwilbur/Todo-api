let bcrypt = require('bcrypt');
let _ = require('underscore');
let cryptojs = require('crypto-js');
let jwt = require('jsonwebtoken');

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
						if (!user || !bcrypt.compareSync(body.password, user.get('password_hash'))) {
							return reject();
						}

						resolve(user);
					}, error => {
						reject();
					});
				});
			},
			findByToken: function (token) {
				return new Promise(function (resolve, reject) {
					try {
						var decodedJWT = jwt.verify(token, 'qwerty098');
						var bytes = cryptojs.AES.decrypt(decodedJWT.token, 'abc123!@#');
						var tokenData = JSON.parse(bytes.toString(cryptojs.enc.Utf8));

						user.findById(tokenData.id).then(function (user) {
							if (user) {
								resolve(user);
							} else {
								reject();
							}
						}, function (error) {
							reject();
						});
					} catch (error) {
						reject();
					}
				});
			}
		},
		instanceMethods: {
			toPublicJSON: function () {
				let json = this.toJSON();
				return _.pick(json, 'id', 'email', 'updatedAt', 'createdAt');
			},
			generateToken: function (type) {
				if (!_.isString(type)) {
					return undefined;
				}

				try {
					let stringData = JSON.stringify({id: this.get('id'), type: type});
					let encryptedData = cryptojs.AES.encrypt(stringData, 'abc123!@#').toString();

					let token = jwt.sign({
						token: encryptedData
					}, 'qwerty098');

					return token;
				} catch (error) {
					return undefined;
				}
			}
		}
	});

	return user;
};

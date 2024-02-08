const basicAuth = require('basic-auth');
const bcrypt = require('bcrypt');

const authenticate = async (req, user) => {
  const credentials = basicAuth(req);
  if (!credentials) {
    throw new Error('Missing credentials');
  }
  const isValid = await bcrypt.compare(credentials.pass, user.password);
  return isValid && credentials.name === user.username;
};

module.exports = authenticate;

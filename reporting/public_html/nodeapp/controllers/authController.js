const path = require('path');

const loginView = path.join(__dirname, '..', 'views', 'login.html');

function getLogin(req, res) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.sendFile(loginView);
}

function postLogin(req, res) {
  const { username, password } = req.body;

    //hardcoded may change later
  if (username === 'admin' && password === 'password123') {
    req.session.user = { username };
    return res.redirect('/dashboard');
  }

  return res.status(401).sendFile(loginView);
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
}

module.exports = {
  getLogin,
  postLogin,
  logout
};

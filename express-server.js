const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['nomnomnom']
}));

const urlDatabase = {
  'b2xVn2': { longURL: 'http://www.lighthouselabs.ca',
              shortURL: 'b2xVn2',
              userID: 'user1'
            },
  '9sm5xK': { longURL: 'http://www.google.com',
              shortURL: '9sm5xK',
              userID: 'user2RandomID'
            }
};

const passwordUser1 = bcrypt.hashSync('password1', 10);
const passwordUser2 = bcrypt.hashSync('password2', 10);

const users = {
  user1: {
    id: 'user1',
    email: 'user1@example.com',
    password: passwordUser1
  },
  user2RandomID: {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: passwordUser2
  }
}


app.get('/', (req, res) => {
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

//Gives page with url
app.get('/urls', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    let templateVars = { urls: urlsForUser(req.session['user_id']),
                         user: users[req.session['user_id']]
                       };
    res.render('urls_index', templateVars);
  } else {
    let message = 'Please log in or register first.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
});


//creates a shortened url
app.get('/urls/new', (req, res) => {
  if (!checkIfLoggedIn(req.session['user_id'])) {
    res.redirect('/login');
  } else {
    let templateVars = { user: users[req.session['user_id']] };
    res.render("urls_new", templateVars);
  }
});

//show the short url page, only if the user owns the page. Error message for invalid link.
app.get('/urls/:id', (req, res) => {
  if (urlDatabase[req.params.id] && urlDatabase[req.params.id]['userID'] === req.session['user_id']) {
    let templateVars = { shortURL: req.params.id,
                         longURL: urlDatabase[req.params.id]['longURL'],
                         user: users[req.session['user_id']]
                       };
    res.render('urls_show', templateVars);
  } else if (urlDatabase[req.params.id]) {
    let message = 'This page does not belong to you.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                 });
  } else {
    let message = 'This page does not exist.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                 });
  }
});

app.post('/urls', (req, res) => {
  let shortURL = generateRandomString();
  let newLongURL = req.body.longURL;
  urlDatabase[shortURL] = { longURL: newLongURL,
                            shortURL: shortURL,
                            userID: req.session['user_id']
                          };
  res.redirect(`/urls/`); //${shortURL}`);
});


app.get('/u/:shortURL', (req, res) => {
  let longURL = urlDatabase[req.params.shortURL]['longURL'];
  res.redirect(longURL);
});

//delets urls
app.post('/urls/:id/delete', (req, res) => {
  let urlId = req.params.id;
  delete urlDatabase[urlId];
  res.redirect('/urls')
})

//updated urls
app.post('/urls/:id', (req, res) => {
  let newLongURL = req.body.updatedLongURL;
  let urlId = req.params.id;
  urlDatabase[urlId] = { longURL: newLongURL,
                         shortURL: urlId,
                         userID: req.session['user_id']
                        };
  res.redirect('/urls');
});

app.get('/login', (req, res) =>{
  let templateVars = { user: users[req.session['user_id']] };
  res.render('urls_login', templateVars);
});

//deals with login
app.post('/login', (req, res) => {
  if (!checkEmailExists(req.body.email)) {
    res.status(403).send('Error: Please enter a valid email and password.');
  }
  let id = findIdByEmail(req.body.email);
  if (!checkPasswordMatches(req.body.password, id)) {
    res.status(403).send('Error: Please enter a valid email and password.');
  }

  req.session['user_id'] = id;
  res.redirect('/');
})


//logout function
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

//register page
app.get('/register', (req, res) => {
  let templateVars = { user: users[req.session['user_id']] };
  res.render('urls_register', templateVars);
});

//takes data from register page
app.post('/register', (req, res) => {
  let id = generateRandomString();
  let email = req.body.email;
  let password = bcrypt.hashSync(req.body.password, 10);
  if (!email || !password) {
    res.status(400).send('Error: Please enter a valid email and password.');
  } else if (checkEmailExists(email)) {
    res.status(400).send('Error: This email address is unavailable.')
  }
  users[id] = { id: id,
                email: email,
                password: password
              };
  req.session['user_id'] = id;
  res.redirect('/urls')
});


function generateRandomString() {
  let stringKey = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 6; i++) {
    let randomIndex = Math.ceil((Math.random() * stringKey.length));
    randomString += stringKey[randomIndex - 1];
  }
  return randomString;
}

function checkEmailExists(email) {
  for (const user in users) {
    if (users[user]['email'] === email) {
      return true;
    }
  }
  return false;
}

function checkPasswordMatches(password, id) {
  if (bcrypt.compareSync(password, users[id]['password'])) {
    return true;
  }
  return false;
}

function findIdByEmail(email) {
  for (const user in users) {
    if (users[user]['email'] === email) {
      return user;
    }
  }
}

function checkIfLoggedIn(userCookie) {
  for (const user in users) {
    if (users[user]['id'] === userCookie) {
      return true;
    }
  }
  return false;
}

function urlsForUser(id) {
  let filteredURLs = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL]['userID'] === id) {
      filteredURLs[shortURL] = urlDatabase[shortURL];
    }
  }
  return filteredURLs;
}






/*~~~~~~~~~~~~~~~~~~~~~~~~~~ Dependencies ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 8080;

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['nomnomnom']
}));

app.set('view engine', 'ejs');

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~ Data ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

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

const users = {
  user1: {
    id: 'user1',
    email: 'user1@example.com',
    password: bcrypt.hashSync('password1', 10)
  },
  user2RandomID: {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: bcrypt.hashSync('password2', 10)
  }
}


/*~~~~~~~~~~~~~~~~~~~~~~~~~~~ Routing ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get('/', (req, res) => {
  if(checkIfLoggedIn(req.session['user_id'])) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }

});

//---------------------- Registration --------------------//

app.get('/register', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    res.redirect('/urls')
  }
  const templateVars = { user: users[req.session['user_id']] };
  res.render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  if (!email || !req.body.password) {
    res.status(400);
    const message = 'Error: Please enter a valid email and password.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  } else if (checkEmailExists(email)) {
    res.status(400);
    const message = 'Error: This email address is unavailable.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  } else {
    const password = bcrypt.hashSync(req.body.password, 10);
    users[id] = { id: id,
                  email: email,
                  password: password
                };
    req.session['user_id'] = id;
    res.redirect('/urls')
  }
});


//------------------------ Login ----------------------//

app.get('/login', (req, res) =>{
  if (checkIfLoggedIn(req.session['user_id'])) {
    res.redirect('/urls')
  }
  const templateVars = { user: users[req.session['user_id']] };
  res.render('urls_login', templateVars);
});

app.post('/login', (req, res) => {
  if (!checkEmailExists(req.body.email)) {
    res.status(403);
    const message = 'Error: Please enter a valid email and password.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
  const id = findIdByEmail(req.body.email);
  if (!checkPasswordMatches(req.body.password, id)) {
    res.status(403);
    const message = 'Error: Please enter a valid email and password.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }

  req.session['user_id'] = id;
  res.redirect('/');
})

app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});



//Gives page with a list of urls if logged in, otherwise gives an error page prompting login
app.get('/urls', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    const templateVars = { urls: urlsForUser(req.session['user_id']),
                         user: users[req.session['user_id']]
                       };
    res.render('urls_index', templateVars);
  } else {
    res.status(403);
    const message = 'Please log in or register first.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
});

//------------------------ Pages ----------------------//

//takes a full url input and creates a corresponding short url
app.post('/urls', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    const shortURL = generateRandomString();
    const newLongURL = req.body.longURL;
    urlDatabase[shortURL] = { longURL: newLongURL,
                              shortURL: shortURL,
                              userID: req.session['user_id']
                            };
    res.redirect(`/urls/${shortURL}`);
  } else {
      res.status(403);
      const message = 'You are not permitted.';
      res.render('urls_forbidden', { user: users[req.session['user_id']],
                                     message
                                    });
  }
});

//directs to the page for input of a long url to be shortened
app.get('/urls/new', (req, res) => {
  if (!checkIfLoggedIn(req.session['user_id'])) {
    res.redirect('/login');
  } else {
    const templateVars = { user: users[req.session['user_id']] };
    res.render("urls_new", templateVars);
  }
});


//show the short url page, only if the user owns the page. Error message for invalid link.
app.get('/urls/:id', (req, res) => {
  const databaseElem = urlDatabase[req.params.id];
  if (databaseElem && databaseElem['userID'] === req.session['user_id']) {
    const templateVars = { shortURL: req.params.id,
                         longURL: databaseElem['longURL'],
                         user: users[req.session['user_id']]
                       };
    res.render('urls_show', templateVars);
  } else if (databaseElem) {
    res.status(403);
    const message = 'This page does not belong to you.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                 });
  } else {
    res.status(404);
    const message = 'This page does not exist.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                 });
  }
});

//edit pre-existing urls if you are logged in and the owner
//can't be accessed from within the site unless you are logged in and the owner
app.post('/urls/:id', (req, res) => {
  const urlId = req.params.id;
  const cookie = req.session['user_id'];
  if (checkIfLoggedIn(cookie) && checkIfOwner(cookie, urlId)) {
    const newLongURL = req.body.updatedLongURL;
    urlDatabase[urlId] = { longURL: newLongURL,
                           shortURL: urlId,
                           userID: req.session['user_id']
                          };
    res.redirect('/urls');
  } else {
    res.status(403);
    const message = 'You are not permitted.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
});

//delets urls if you are logged in and the url owner.
//can't be accessed from within the site unless you are logged in and the owner
app.post('/urls/:id/delete', (req, res) => {
  const urlId = req.params.id;
  const cookie = req.session['user_id'];
  if (checkIfLoggedIn(cookie) && checkIfOwner(cookie, urlId)) {
    delete urlDatabase[urlId];
    res.redirect('/urls');
  } else {
    res.status(403);
    const message = 'You are not permitted.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
})

//redirects to the page corresponding to the shortURL, or returns an error
app.get('/u/:shortURL', (req, res) => {
  const shortLink = req.params.shortURL;
  if (urlDatabase[shortLink]) {
    const longURL = urlDatabase[shortLink]['longURL'];
    res.redirect(longURL);
  } else {
    res.status(404);
    const message = 'This page does not exist.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                 });
  }

});


/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Functions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

function generateRandomString() {
  const stringKey = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.ceil((Math.random() * stringKey.length));
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

function checkIfOwner(cookie, urlId) {
  if (urlDatabase[urlId]['userID'] === cookie) {
    return true;
  }
  return false;
}






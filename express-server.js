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

//register page
app.get('/register', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    res.redirect('/urls')
  }
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

app.get('/login', (req, res) =>{
  if (checkIfLoggedIn(req.session['user_id'])) {
    res.redirect('/urls')
  }
  let templateVars = { user: users[req.session['user_id']] };
  res.render('urls_login', templateVars);
});

//deals with login
app.post('/login', (req, res) => {
  if (!checkEmailExists(req.body.email)) {
    res.status(403);
    let message = 'Error: Please enter a valid email and password.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
  let id = findIdByEmail(req.body.email);
  if (!checkPasswordMatches(req.body.password, id)) {
    res.status(403);
    let message = 'Error: Please enter a valid email and password.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }

  req.session['user_id'] = id;
  res.redirect('/');
})


//logout function
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

//Gives page with a list of urls if logged in, otherwise gives an error page prompting login
app.get('/urls', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    let templateVars = { urls: urlsForUser(req.session['user_id']),
                         user: users[req.session['user_id']]
                       };
    res.render('urls_index', templateVars);
  } else {
    res.status(403);
    let message = 'Please log in or register first.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
});

//takes a full url input and creates a corresponding short url
app.post('/urls', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    let shortURL = generateRandomString();
    let newLongURL = req.body.longURL;
    urlDatabase[shortURL] = { longURL: newLongURL,
                              shortURL: shortURL,
                              userID: req.session['user_id']
                            };
    res.redirect(`/urls/`); //${shortURL}`);
  } else {
      res.status(403);
      let message = 'You are not permitted.';
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
  let databaseElem = urlDatabase[req.params.id];
  if (databaseElem && databaseElem['userID'] === req.session['user_id']) {
    let templateVars = { shortURL: req.params.id,
                         longURL: databaseElem['longURL'],
                         user: users[req.session['user_id']]
                       };
    res.render('urls_show', templateVars);
  } else if (databaseElem) {
    res.status(403);
    let message = 'This page does not belong to you.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                 });
  } else {
    res.status(404);
    let message = 'This page does not exist.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                 });
  }
});

//edit pre-existing urls
app.post('/urls/:id', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    let newLongURL = req.body.updatedLongURL;
    let urlId = req.params.id;
    urlDatabase[urlId] = { longURL: newLongURL,
                           shortURL: urlId,
                           userID: req.session['user_id']
                          };
    res.redirect('/urls');
  } else {
    res.status(403);
    let message = 'You are not permitted.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
});

//delets urls
app.post('/urls/:id/delete', (req, res) => {
  if (checkIfLoggedIn(req.session['user_id'])) {
    let urlId = req.params.id;
    delete urlDatabase[urlId];
    res.redirect('/urls');
  } else {
    res.status(403);
    let message = 'You are not permitted.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                  });
  }
})

//redirects to the page corresponding to the shortURL, or returns an error
app.get('/u/:shortURL', (req, res) => {
  let shortLink = req.params.shortURL;
  if (urlDatabase[shortLink]) {
    let longURL = urlDatabase[shortLink]['longURL'];
    res.redirect(longURL);
  } else {
    res.status(404);
    let message = 'This page does not exist.';
    res.render('urls_forbidden', { user: users[req.session['user_id']],
                                   message
                                 });
  }

});


/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Functions~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

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






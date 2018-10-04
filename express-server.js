const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  user1: {
    id: 'user1',
    email: 'user1@example.com',
    password: 'password1'
  },
  user2RandomID: {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: 'password2'
  }
}


app.get('/', (req, res) => {
  res.redirect('/urls');
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

//Gives page with url
app.get('/urls', (req, res) => {
  let templateVars = { urls: urlDatabase,
                       username: req.cookies["username"]
                     };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  let templateVars = { username: req.cookies["username"] };
  res.render("urls_new", templateVars);
});

//deals with username login cookie
app.post('/login', (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect("/urls/");
})

app.get('/urls/:id', (req, res) => {
  if (urlDatabase[req.params.id]) {
    let templateVars = { shortURL: req.params.id,
                         longURL: urlDatabase[req.params.id],
                         username: req.cookies["username"]
                       };
    res.render('urls_show', templateVars);
  } else {
      res.redirect('/');
}
});

app.post('/urls', (req, res) => {
  let shortURL = generateRandomString();
  let newLongURL = req.body.longURL;
  console.log(newLongURL);
  urlDatabase[shortURL] = newLongURL;
  res.redirect(`/urls/`); //${shortURL}`);
});


app.get('/u/:shortURL', (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
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
  urlDatabase[urlId] = newLongURL;
  res.redirect('/urls');
});

//logout function
app.post('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/urls');
});

//register page
app.get('/register', (req, res) => {
  let templateVars = { username: req.cookies["username"] };
  res.render('urls_register', templateVars);
});

//takes data from register page
app.post('/register', (req, res) => {
  let id = generateRandomString();
  let email = req.body.email;
  let password = req.body.password;
  users[id] = { id: id,
                email: email,
                password: password
              };
  res.cookie('user_id', id);
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











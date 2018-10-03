const express = require('express');
const app = express();
const PORT = 8080;
const bodyParser = require('body-parser');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.get('/', (req, res) => {
  res.redirect('/urls');
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get('/urls', (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render('urls_index', templateVars);
});

app.get('/urls/new', (req, res) => {
  res.render("urls_new");
});

app.get('/urls/:id', (req, res) => {
  if (urlDatabase[req.params.id]) {
    let templateVars = { shortURL: req.params.id,
                         longURL: urlDatabase[req.params.id]
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
  console.log(longURL);
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

function generateRandomString() {
  let stringKey = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 6; i++) {
    let randomIndex = Math.ceil((Math.random() * stringKey.length));
    randomString += stringKey[randomIndex - 1];
  }
  return randomString;
}











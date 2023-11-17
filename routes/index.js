const express = require('express')
const app = express.Router()
const chalk = require('chalk');
const { QuickDB } = require('quick.db')
const dbb = new QuickDB()
const { google } = require('googleapis');

function consolelog() {
console.log(chalk.hex('#59d0ff').bold('[Website] Index router successfully started'))
}

setTimeout(consolelog, 2000)

app.get('/', function(req, res) {
  const user = req.session.user
  const session = req.session
  const user2 = require("../models/user");
  user2.findOne({ username: user }, async (err, data) => {
    if(!data){
       res.render('login.ejs', { user: user });
    }else{
      res.redirect('admin/drivelist')
    }
  })
});

app.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
    if (err) {
      console.log(err);
      res.send("Error")
    } else {
      res.redirect('/')
    }
  })
})



app.get('/login', function(req, res) {
  const user = req.session.user
  if (user) {
    res.redirect('/')
  } else {
    res.render('login.ejs', { user: user });
  }
});



module.exports = app;
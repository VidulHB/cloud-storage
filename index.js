const express = require('express')
const serverless = require('serverless-http');
const app = express()
const PORT = 3000;
const html = require('html');
const ejs = require('ejs')
const path = require('path');
const mongoose = require("mongoose");
const bodyParser = require('body-parser')
const session = require("express-session");
const chalk = require('chalk');
const { v4: uuidv4 } = require("uuid");
app.use(express.static(__dirname + '/public'));
const MongoDBURI = 'mongodb+srv://vidul:v1i1d1u4l@movie-database.c5jv16g.mongodb.net/?retryWrites=true&w=majority'

const { MongoClient } = require('mongodb');
const { QuickDB } = require("quick.db");
const dbb = new QuickDB()
const MongoStore = require("connect-mongo")(session);
const client = new MongoClient(MongoDBURI);

const dbName = 'myProject';

async function main() {
  await client.connect();
  console.log(chalk.hex('#59d0ff').bold('[QuickDB] Successfully connected to server'));
  const db = client.db(dbName);
  const collection = db.collection('documents');
  return '';
}
main()
  .then()
  .catch(console.error)
  .finally(() => client.close());

mongoose.connect(MongoDBURI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const db2 = mongoose.connection;
db2.on("error", console.error.bind(console, "connection error:"));
db2.once("open", () => { console.log(chalk.hex('#59d0ff').bold('[MongoDB] Successfully connected to server'))});
app.use(
  session({
    secret: "LHDIDH$#%@$^#$^oq$#@%FSDFDSF@$ihvVSFIVHISHI41$#@^#%&#$$@#$JBVVLJSV",
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: db2,
    }),
    cookie: {
      maxAge: 1 * 24 * 60 * 60 * 1000 * 1000
    }
  })
);


app.listen(`${PORT}`, () => {
  console.clear();
  console.log(chalk.hex('#59d0ff').bold('[Website] Web App successfully started'));
})
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use(session({
  secret: uuidv4(), 
  resave: false,
  saveUninitialized: true
}));

app.use(express.json({limit: '200000mb'}));
app.use(express.urlencoded({limit: '200000mb'}));

const index = require('./routes/index.js')
const admin = require('./routes/admin.js')
const API = require('./routes/api.js')
const upload = require('./routes/upload.js')
app.use('/', index)
app.use('/admin', admin)
app.use('/Api', API)
app.use('/Upload', upload)
app.use((req, res, next) => {
    res.render('404.ejs')
})
module.exports.handler = serverless(app);
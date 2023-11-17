const express = require('express')
const api = express.Router()
const app = express()
const chalk = require('chalk');
const { QuickDB } = require('quick.db')
const dbb = new QuickDB()
const { google } = require('googleapis');

const KEYFILEPATH = 'service.json'
  const SCOPES = ['https://www.googleapis.com/auth/drive'];

  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});


function consolelog() {
console.log(chalk.hex('#59d0ff').bold('[API] API successfully started'))
}

setTimeout(consolelog, 2000)

api.post('/login', async function(req, res, next) {
  const info = req.body
  const user = require('../models/user')
  user.findOne({ username: info.username }, async (err, data) => {
    if (data) {
      user.findOne({ password: info.password }, async (err, data) => {
        if (data) {
          req.session.user = data.username;
          res.redirect('/')
        } else {
          res.status(401).json({ "message": "password incorrect" })
        }
      })
    } else {
      res.status(401).json({ "message": "username incorrect" })
    }
  })
})
const drive = google.drive({ version: 'v3', auth });
async function getFolderSize(folderId) {
   let totalSize = 0;

   try {
     const response = await drive.files.list({
       q: `'${folderId}' in parents and trashed = false`,
       fields: 'files(id, name, size)',
     });

     const files = response.data.files;
      for(var i=0; i<files.length; i++) {
       totalSize += parseInt(files[i].size || 0);
     }

     return totalSize;
   } catch (error) {
     console.error('Error calculating folder size:', error);
     return -1;
   }
 }
api.get('/size', async function(req, res, next) {
           const theid = req.query.id
           
           getFolderSize(theid)
             .then(size => {
               if (size === -1) {
                 console.log('Error calculating folder size.');
               } else {
                 const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                                const bytes = size
                  const base = 1024
                  const index = Math.floor(Math.log(bytes) / Math.log(base));
                   let formattedSize;
                 if (index === 2) {
                   formattedSize = (bytes / Math.pow(base, index)).toFixed(1);
                 } else {
                   formattedSize = (bytes / Math.pow(base, index)).toFixed(0);
                 }
                res.json({size: `${formattedSize}${sizes[index]}`})
                 
               }
             });
         })


module.exports = api;
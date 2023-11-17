const express = require('express')
const app = express.Router()
const multer = require('multer');
const chalk = require('chalk');
const stream = require('stream');
const path = require('path')
const { google } = require('googleapis');

function consolelog() {
console.log(chalk.hex('#59d0ff').bold('[Upload] Upload system successfully started'))
}

setTimeout(consolelog, 2000)


const MStorage = multer.diskStorage({
     destination: function(req, file, callback) {
         callback(null, "./Images");
     },
     filename: function(req, file, callback) {
         callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
     }
 });

 const MUpload = multer({
     storage: MStorage,
   limits: {
    fileSize: 10*1024*1024*1024
}
 }).array("file", 3);

  const KEYFILEPATH = 'service.json'
  const SCOPES = ['https://www.googleapis.com/auth/drive'];

  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  });

const drive = google.drive({ version: 'v3', auth })

app.get('/file/:fileName', async (req, res) => {
  const { fileName } = req.params;

  try {
    const response = await drive.files.list({
      q: `name = '${fileName}'`,
      pageSize: 1,
      fields: 'files(id)',
    });

    const files = response.data.files;
    if (files.length === 0) {
      res.status(404).send('File not found');
      return;
    }

    const fileId = files[0].id;

    const fileResponse = await drive.files.get({
      fileId,
      alt: 'media',
    }, { responseType: 'stream' });

    const mimeType = fileResponse.headers['content-type'];
    res.setHeader('Content-Type', mimeType);

    fileResponse.data
      .on('end', () => res.end())
      .on('error', (err) => {
        console.error('Error fetching file from Google Drive:', err);
        res.status(500).send('Internal Server Error');
      })
      .pipe(res);
  } catch (error) {
    console.error('Error fetching file from Google Drive:', error);
    res.status(500).send('Internal Server Error');
  }
});




// const uploadRouter = express.Router();
// const upload = multer();
// const readline = require('readline');

// const uploadFile = async (fileObject, res, date, body) => {
//   const bufferStream = new stream.PassThrough();
//   bufferStream.end(fileObject.buffer);
//   const Filename = `${fileObject.fieldname + "_" + date + "_" + fileObject.originalname}`;

//   const fileSize = fileObject.buffer.length;

//   const media = {
//     mimeType: fileObject.mimeType,
//     body: bufferStream,
//   };

//   const fileMetadata = {
//     name: Filename,
//     parents: [`15OC8dRcwQDu6FgFVYKuY0S8YVJLUe4tw`],
//   };

//   const upload = drive.files.create(
//     {
//       resource: fileMetadata,
//       media: media,
//       fields: 'id,name',
//     },
//   );
//   try {
//     res.status(200).send(`${Filename}`);
//   } catch (error) {
//     console.error('Error uploading file:', error);
//     res.status(500).send('Error uploading file');
//   }
// };





// app.post('/', upload.any(), async (req, res) => {
//   try {
//     const { files } = req;
//       await uploadFile(files, res)
//   } catch (f) {
//     res.send(f.message);
//   }
// });

const uploadRouter = express.Router();
const upload = multer();
const readline = require('readline');

const uploadFile = async (fileObject, res, body) => {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileObject.buffer);
  const Filename = `${fileObject.originalname}`;

  const fileSize = fileObject.buffer.length;

  const media = {
    mimeType: fileObject.mimeType,
    body: bufferStream,
  };

  const fileMetadata = {
    name: Filename,
    parents: [`${body.id}`],
  };

  const upload = drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: 'id,name',
    }
  );

  return upload; // Return the upload promise.
};

app.post('/', upload.any(), async (req, res) => {
  try {
    const { files } = req;

    // Create an array to store the upload promises.
    const uploadPromises = [];

    // Loop through the files and start uploading each file.
    for (const file of files) {
      const uploadPromise = uploadFile(file, res, req.body);
      uploadPromises.push(uploadPromise);
    }

    // Wait for all uploads to complete.
    await Promise.all(uploadPromises);

    // Send a response after all files have been uploaded.
    res.status(200)
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).send('Error uploading files');
  }
});


app.post('/deletefile', async (req, res) => {
  const fileID = req.body.id
  try {
     drive.files.delete({
      fileId: fileID,
    },
    (err, res) => {
      if (err) return console.error('The API returned an error:', err.message);
    }
  );
  } catch (f) {
    console.log(f.message);
  }
});

const createFolder = async (folderName, parentFolderId) => {
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId], // Set the parent folder ID if it's a subfolder
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });

    console.log(`Created folder with ID: ${response.data.id}`);
    return response.data.id; // Returns the ID of the newly created folder
  } catch (error) {
    console.error(`Error creating folder: ${error}`);
    return null;
  }
};
app.post('/createfolder', async (req, res) => {
  const info = req.body
    createFolder(info.name, info.id)
})

async function changeSharingSettingsToAnyoneWithLink(fileId, role) {
  try {
    const newPermission = {
      type: 'anyone',
      role: role,
    };
    await drive.permissions.create({
      fileId: fileId,
      requestBody: newPermission,
    });

  } catch (error) {
    console.error('Error changing sharing settings:', error);
    throw error;
  }
}

app.post('/togglerole', async (req, res) => {
  const fileID = req.body.id
  try {
     if(req.body.role === 'writer'){
       changeSharingSettingsToAnyoneWithLink(fileID, 'reader')
     }else{
       changeSharingSettingsToAnyoneWithLink(fileID, 'writer')
     }
  } catch (f) {
    console.log(f.message);
  }
});

module.exports = app;
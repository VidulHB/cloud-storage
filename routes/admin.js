const express = require('express')
const admin = express.Router()
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
  console.log(chalk.hex('#59d0ff').bold('[Website] Admin router successfully started'))
}

setTimeout(consolelog, 2000)

admin.get('/', function(req, res) {
  const user = req.session.user
  const user2 = require("../models/user")
  user2.findOne({ username: user }, async (err, data) => {
    if (!data) {
      res.redirect('/')
    } else {
      if (data.admin === true) {
        res.render('admin/admin.ejs', {
          user: user,
          data: data,
        });
      } else {
        res.redirect('/')
      }
    }
  })
});

admin.get('/uploadfile', function(req, res) {
  const user = req.session.user
  const FolderID = req.query.id
  const user2 = require("../models/user")
  user2.findOne({ username: user }, async (err, data) => {
    if (!data) {
      res.redirect('/')
    } else {
      if (data.admin === true) {
        res.render('admin/uploadfile.ejs', {
          user: user,
          data: data,
          FolderID: FolderID,
        });
      } else {
        res.redirect('/')
      }
    }
  })
});

// admin.get('/filelist', function(req, res) {
//   const user = req.session.user
//   const user2 = require("../models/user")
//   const drive = google.drive({ version: 'v3', auth });
//  const pageToken = req.query.pageToken
//   const thefolder = req.query.folder

//   user2.findOne({ username: user }, async (err, data) => {
//     if (!data) {
//       res.redirect('/')
//     } else {
//       if (data.admin === false) {
//         res.redirect('/')
//       } else {
//   drive.files.list(
//     {
//       q: `'${thefolder}' in parents`,
//       pageSize:500,
//       pageToken: pageToken,
//       fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink)',
//     },
//     (err, res2) => {
//       if (err) return console.error('The API returned an error:', err.message);

//       const files = res2.data.files;
//       if (files.length) {
//         const jsondata = JSON.stringify(files, null, 2)
//         const fdata = JSON.parse(jsondata);
//         res.render('admin/filelist.ejs', {
//           user: user,
//           data: data,
//           fdata: fdata,
//           cpageToken: pageToken,
//           pageToken: res2.data.nextPageToken,
//         });
//       } else {
//         console.log('No files found in the specified folder.');
//       }
//     }
//   );
 
//       }
//     }
//   })
// });
const drive = google.drive({ version: 'v3', auth });

async function getFolderSize(folderId) {
   let totalSize = 0;

   try {
     // const response = await drive.files.list({
     //   q: `'${folderId}' in parents and trashed = false`,
     //   fields: 'files(id, name, size)',
     // });
     const getAllFilesInFolder = async (folderId) => {
       const response = await drive.files.list({
         q: `'${folderId}' in parents and trashed = false`,
         fields: 'files(id, name, size, mimeType, parents)',
       });

       const files = response.data.files;

       const getAllFilesRecursively = async (folderId) => {
         const subResponse = await drive.files.list({
           q: `'${folderId}' in parents and trashed = false`,
           fields: 'files(id, name, size, mimeType, parents)',
         });

         const subFiles = subResponse.data.files;
         for (const subFile of subFiles) {
           files.push(subFile);
           if (subFile.mimeType === 'application/vnd.google-apps.folder') {
             await getAllFilesRecursively(subFile.id);
           }
         }
       };

       for (const file of files) {
         if (file.mimeType === 'application/vnd.google-apps.folder') {
           await getAllFilesRecursively(file.id);
         }
       }

       return files;
     };
     const allFiles = await getAllFilesInFolder(folderId);

      for(var i=0; i<allFiles.length; i++) {
       totalSize += parseInt(allFiles[i].size || 0);
     }

     return totalSize;
   } catch (error) {
     console.error('Error calculating folder size:', error);
     return -1;
   }
 }

const getFolderHierarchy = async (folderId) => {
  const hierarchy = [];
  await getFolderHierarchyRecursive(folderId, hierarchy);
  return hierarchy;
};

const getFolderHierarchyRecursive = async (folderId, hierarchy) => {
  const response = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, parents',
  });

  const folder = response.data;
  const folderName = folder.name;
  
  hierarchy.push({ foldername: folderName, id: folder.id });

  if (folder.parents && folder.parents.length > 0) {
    const parentFolderId = folder.parents[0];
    await getFolderHierarchyRecursive(parentFolderId, hierarchy);
  }
};


async function changeSharingSettingsToAnyoneWithLink(fileId) {
  try {
    const newPermission = {
      type: 'anyone',
      role: 'reader',
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

admin.get('/filelist', function(req, res) {
  const user = req.session.user;
  const user2 = require("../models/user");
  const pageToken = req.query.pageToken;
  const thefolder = req.query.folder;

  user2.findOne({ username: user }, async (err, data) => {
    if (!data) {
      res.redirect('/');
    } else {
      if (data.admin === false) {
        res.redirect('/');
      } else {
        // First, get the list of files in the specified folder
        drive.files.list(
          {
            q: `'${thefolder}' in parents`,
            pageSize: 500,
            pageToken: pageToken,
            fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, parents, webViewLink, permissions)',
          },
          (err, res2) => {
            if (err) return console.error('The API returned an error:', err.message);

            const files = res2.data.files;
            if (files.length) {
              const jsondata = JSON.stringify(files, null, 2);
              const fdata = JSON.parse(jsondata);
              const parentFolderId = fdata[0].parents[0];
              drive.files.get(
                {
                  fileId: parentFolderId,
                  fields: 'name, id, parents',
                },
                async (err, parentFolder) => {
                  if (err) return console.error('Error retrieving parent folder name:', err.message);
                  const parentFolderid = parentFolder.data.id;
                  const Fpath = await getFolderHierarchy(parentFolderid);
                  for(var i=0; i<fdata.length; i++) {
                    if(fdata[i].mimeType === 'application/vnd.google-apps.folder') {
                      if(fdata[i].permissions[1].type === 'anyone'){
                      }else{
                      changeSharingSettingsToAnyoneWithLink(`${fdata[i].id}`)
                      }
                    }
                  }

                  getFolderSize(Fpath[0].id).then(size => {
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const bytes = size;
                    const base = 1024;
                    const index = Math.floor(Math.log(bytes) / Math.log(base));
                    let formattedSize;
                    if (index === 2) {
                      formattedSize = (bytes / Math.pow(base, index)).toFixed(1);
                    } else {
                      formattedSize = (bytes / Math.pow(base, index)).toFixed(0);
                    }
                    const Dsize = `${formattedSize}${sizes[index]}`;
                    if(Dsize === 'NaNundefined'){
                      res.render('admin/filelist.ejs', {
                        user: user,
                        data: data,
                        fdata: fdata,
                        files: true,
                        folderID: thefolder,
                        folderPath: Fpath.reverse(),
                        path2: Fpath,
                        driveFolderSize: '0MB',
                        cpageToken: pageToken,
                        pageToken: res2.data.nextPageToken,
                      });
                    }else{
                    res.render('admin/filelist.ejs', {
                      user: user,
                      data: data,
                      fdata: fdata,
                      files: true,
                      folderID: thefolder,
                      folderPath: Fpath.reverse(),
                      path2: Fpath,
                      driveFolderSize: Dsize,
                      cpageToken: pageToken,
                      pageToken: res2.data.nextPageToken,
                    });
                    }
                  });
                }
              );
            } else {
              // Render without fdata, cpageToken, and pageToken when there are no files
              const parentFolderId = thefolder;
              drive.files.get(
                {
                  fileId: parentFolderId,
                  fields: 'name, id, parents',
                },
                async (err, parentFolder) => {
                  if (err) return console.error('Error retrieving parent folder name:', err.message);

                  const parentFolderid = parentFolder.data.id;
                  const Fpath = await getFolderHierarchy(parentFolderId);

                  getFolderSize(Fpath[0].id).then(size => {
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const bytes = size;
                    const base = 1024;
                    const index = Math.floor(Math.log(bytes) / Math.log(base));
                    let formattedSize;
                    if (index === 2) {
                      formattedSize = (bytes / Math.pow(base, index)).toFixed(1);
                    } else {
                      formattedSize = (bytes / Math.pow(base, index)).toFixed(0);
                    }
                    const Dsize = `${formattedSize}${sizes[index]}`;
                    if(Dsize === 'NaNundefined'){
                      res.render('admin/filelist.ejs', {
                        user: user,
                        data: data,
                        files: false,
                        folderID: thefolder,
                        folderPath: Fpath.reverse(),
                        path2: Fpath,
                        driveFolderSize: '0MB',
                      });
                    }else{
                    res.render('admin/filelist.ejs', {
                      user: user,
                      data: data,
                      files: false,
                      folderID: thefolder,
                      folderPath: Fpath.reverse(),
                      path2: Fpath,
                      driveFolderSize: Dsize,
                    });
                    }
                  });
                })
            }
          }
        );
      }
    }
  });
});


// admin.get('/filelist', function(req, res) {
//   const user = req.session.user;
//   const user2 = require("../models/user");
//   const pageToken = req.query.pageToken;
//   const thefolder = req.query.folder;

//   user2.findOne({ username: user }, async (err, data) => {
//     if (!data) {
//       res.redirect('/');
//     } else {
//       if (data.admin === false) {
//         res.redirect('/');
//       } else {
//         // First, get the list of files in the specified folder
//         drive.files.list(
//           {
//             q: `'${thefolder}' in parents`,
//             pageSize: 500,
//             pageToken: pageToken,
//             fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, thumbnailLink, parents)',
//           },
//           (err, res2) => {
//             if (err) return console.error('The API returned an error:', err.message);

//             const files = res2.data.files;
//             if (files.length) {
//               const jsondata = JSON.stringify(files, null, 2);
//               const fdata = JSON.parse(jsondata);
//               const parentFolderId = fdata[0].parents[0];
//               drive.files.get(
//                 {
//                   fileId: parentFolderId,
//                   fields: 'name, id, parents',
//                 },
//                async (err, parentFolder) => {
//                   if (err) return console.error('Error retrieving parent folder name:', err.message);

//                   const parentFolderid = parentFolder.data.id;
//                   const Fpath = await getFolderHierarchy(parentFolderid);

//                  getFolderSize(Fpath[0].id).then(size => {
//                      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
//                      const bytes = size;
//                      const base = 1024;
//                      const index = Math.floor(Math.log(bytes) / Math.log(base));
//                      let formattedSize;
//                      if (index === 2) {
//                        formattedSize = (bytes / Math.pow(base, index)).toFixed(1);
//                      } else {
//                        formattedSize = (bytes / Math.pow(base, index)).toFixed(0);
//                      }
//                      const Dsize = `${formattedSize}${sizes[index]}`;
//                    res.render('admin/filelist.ejs', {
//                      user: user,
//                      data: data,
//                      fdata: fdata,
//                      folderPath: Fpath.reverse(),
//                      driveFolderSize: Dsize,
//                      cpageToken: pageToken,
//                      pageToken: res2.data.nextPageToken,
//                    });
//                  })
                 

                 
//                 }
//               );
//             }else{
              
//             }
//           }
//         );
//       }
//     }
//   });
// });

admin.get('/drivelist', async function(req, res) {
  const user = req.session.user;
  const user2 = require("../models/user");
  const pageToken = req.query.pageToken;

  user2.findOne({ username: user }, (err, data) => {
    if (!data) {
      res.redirect('/');
    } else {
      if (data.admin === false) {
        res.redirect('/');
      } else {
        drive.files.list(
          {
            pageSize: 500,
            pageToken: pageToken,
            fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)',
          },
          (err, res2) => {
            if (err) return console.error('The API returned an error:', err.message);

            const files = res2.data.files;
            if (files.length) {
              const jsondata = JSON.stringify(files, null, 2);
              let fdata = JSON.parse(jsondata);
              let Drivedata = [];

              const folderPromises = fdata
                .filter(file => file.mimeType === 'application/vnd.google-apps.folder' && file.name.includes('Drive'))
                .map(file => getFolderSize(file.id).then(size => {
                  if (size === -1) {
                    console.log('Error calculating folder size.');
                  } else {
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const bytes = size;
                    const base = 1024;
                    const index = Math.floor(Math.log(bytes) / Math.log(base));
                    let formattedSize;
                    if (index === 2) {
                      formattedSize = (bytes / Math.pow(base, index)).toFixed(1);
                    } else {
                      formattedSize = (bytes / Math.pow(base, index)).toFixed(0);
                    }
                    const Fsize2 = `${formattedSize}${sizes[index]}`;
                    if(Fsize2 === 'NaNundefined'){
                      const Fsize = '0MB'
                      Drivedata.push({ ...file, Fsize });
                    }else{
                      const Fsize = `${formattedSize}${sizes[index]}`;
                    Drivedata.push({ ...file, Fsize });
                    }
                  }
                }));

              Promise.all(folderPromises)
                .then(() => {
                  res.render('admin/drivelist.ejs', {
                    user: user,
                    data: data,
                    fdata: Drivedata,
                    cpageToken: pageToken,
                    pageToken: res2.data.nextPageToken,
                  });
                })
                .catch(error => {
                  console.error('An error occurred while processing folder sizes:', error);
                  
                });
            } else {
              console.log('No files found in the specified folder.');f
            }
          }
        );
      }
    }
  });
});


admin.get('/dashboard', function(req, res) {
  const user = req.session.user
  const user2 = require("../models/user")
  const quiz = require("../models/quiz");
  const blog = require("../models/blog");
  const news = require("../models/news");
  const challenge = require("../models/challenge");
  const learn = require("../models/learn");
  const drive = google.drive({ version: 'v3', auth });
    quiz.find({}, async (err, qdata) => {
    user2.find({}, async (err, udata) => {
      blog.find({}, async (err, bdata) => {
        news.find({}, async (err, ndata) => {
        challenge.find({}, async (err, cdata) => {
        learn.find({}, async (err, ldata) => {
  user2.findOne({ username: user }, async (err, data) => {
    if (!data) {
      res.redirect('/')
    } else {
      if (data.admin === false) {
        res.redirect('/')
      } else {
         drive.files.list(
    {
      q: `'${process.env['FILEUPLOADPARENT']}' in parents`,
      pageSize: 100,
      fields: 'nextPageToken, files(name, mimeType, size, thumbnailLink)',
    },
    (err, res2) => {
      if (err) return console.error('The API returned an error:', err.message);

      const files = res2.data.files;
      if (files.length) {
        const jsondata = JSON.stringify(files, null, 2)
        const fdata = JSON.parse(jsondata);
        res.render('admin/dashboard.ejs', {
          user: user,
          data: data,
          udata: udata,
          qdata: qdata,
          bdata: bdata,
          ndata: ndata,
          ldata: ldata,
          fdata: fdata,
        });
        }
    })
 
      }
    }
  })
    })
      })
    })
       })
    })
    })
});



module.exports = admin;
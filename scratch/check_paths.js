const { app } = require('electron');
console.log('App Path:', app.getAppPath());
console.log('Exe Path:', app.getPath('exe'));
app.quit();

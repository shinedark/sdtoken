const fs = require('fs');
const path = require('path');

const directory = 'frontend/src/assets/images';

fs.readdir(directory, (err, files) => {
  if (err) throw err;

  files.forEach(file => {
    if (file.includes('Medium')) {
      const newName = file.replace(' Medium', '');
      fs.rename(
        path.join(directory, file),
        path.join(directory, newName),
        err => {
          if (err) throw err;
          console.log(`Renamed ${file} to ${newName}`);
        }
      );
    }
  });
});

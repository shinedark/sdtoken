const fs = require('fs')
const path = require('path')

// Function to rename artwork files consistently
const renameArtwork = () => {
  const baseDir = __dirname
  const dirs = fs.readdirSync(baseDir)

  dirs.forEach((dir) => {
    const dirPath = path.join(baseDir, dir)
    if (fs.statSync(dirPath).isDirectory()) {
      const files = fs.readdirSync(dirPath)

      // Look for artwork files
      const artworkFile = files.find(
        (file) =>
          file.toLowerCase().includes('artwork') ||
          file.toLowerCase().includes('art') ||
          file.endsWith('.png') ||
          file.endsWith('.jpg') ||
          file.endsWith('.jpeg'),
      )

      if (artworkFile) {
        const oldPath = path.join(dirPath, artworkFile)
        const newPath = path.join(dirPath, 'artwork.png')

        // Rename to artwork.png
        if (oldPath !== newPath) {
          fs.renameSync(oldPath, newPath)
          console.log(`Renamed ${artworkFile} to artwork.png in ${dir}`)
        }
      }
    }
  })
}

renameArtwork()

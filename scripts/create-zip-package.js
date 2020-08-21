const fs = require('fs');
const path = require('path');
const zipdir = require('zip-dir');

const platform = process.argv[2] || 'chromium';
const version = fs.readFileSync(path.resolve(__dirname, '../version.txt'), 'utf8');
const dirToZip = path.resolve(__dirname, `../build/${platform}`);
const outputDir = './dist';
const outputFilePath = `${outputDir}/xbrowsersync_${version}_${platform}.zip`;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}
zipdir(dirToZip, { saveTo: outputFilePath }, (err) => {
  if (err) {
    throw err;
  }
});

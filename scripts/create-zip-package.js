const fs = require('fs');
const path = require('path');
const zipdir = require('zip-dir');

const platform = process.argv[2] || 'chromium';

const dirToZip = path.resolve(__dirname, `../build/${platform}`);
const outputDir = './dist';

const file = require(`${dirToZip}/manifest.json`);
const version = file.version;

const outputFilePath = `${outputDir}/xbrowsersync_${version}_${platform}.zip`;
console.log(`outputFilePath: ${outputFilePath}`);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}
zipdir(dirToZip, { saveTo: outputFilePath }, (err) => {
  if (err) {
    throw err;
  }
});

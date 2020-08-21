const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const platform = process.argv[2] || 'chromium';
const buildNum = process.argv[3] || process.env.TRAVIS_BUILD_NUMBER || 0;

const newVersion = `${process.env.npm_package_version}.${buildNum}`;
const versionFileName = path.resolve(__dirname, '../version.txt');
fs.writeFileSync(versionFileName, `${newVersion}`);

const updateBuildNumberForWebext = (platformName) => {
  const fileName = path.resolve(__dirname, `../build/${platformName}/manifest.json`);
  const file = require(fileName);
  file.version = newVersion;
  fs.writeFileSync(fileName, JSON.stringify(file, null, 2));
};

const getAndroidVersionCode = (version) => {
  const versionArr = version.split('.');
  const build = versionArr.pop();
  return `${versionArr.join('')}${build.padStart(2, 0)}`;
};

const updateBuildNumberForAndroid = () => {
  const filePath = path.resolve(__dirname, '../build/android/config.xml');
  const parser = new xml2js.Parser();
  const builder = new xml2js.Builder();

  const data = fs.readFileSync(filePath);
  parser.parseString(data, (err, result) => {
    result.widget.$.version = newVersion;
    result.widget.$['android-versionCode'] = getAndroidVersionCode(newVersion);
    const xml = builder.buildObject(result);
    fs.writeFileSync(filePath, xml);
  });
};

switch (platform) {
  case 'chromium':
  case 'firefox':
    updateBuildNumberForWebext(platform);
    break;
  case 'android':
    updateBuildNumberForAndroid();
    break;
  default:
}

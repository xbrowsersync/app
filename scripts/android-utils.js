const getAndroidVersionCode = (version) => {
  const versionArr = version.split('.');
  const build = versionArr.pop();
  return `${versionArr.map((x) => x.replace(/\D/g, '')).join('')}${build.padStart(2, 0)}`;
};

module.exports = {
  getAndroidVersionCode
};

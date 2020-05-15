const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
  const gradlePropsFileLocation = path.join(ctx.opts.projectRoot, 'platforms/android/gradle.properties');
  fs.readFile(gradlePropsFileLocation, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(/(org\.gradle\.jvmargs=).*/gi, '$1-Xms1024m -Xmx4096m');
    fs.writeFile(gradlePropsFileLocation, result, 'utf8', function (err) {
      if (err) {
        return console.log(err);
      }
    });
  });
};
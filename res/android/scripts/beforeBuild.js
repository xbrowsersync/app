const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
  let source, destination;

  // Copy build-extras.gradle
  source = path.join(ctx.opts.projectRoot, 'build-extras.gradle');
  destination = path.join(ctx.opts.projectRoot, 'platforms/android/app/build-extras.gradle');
  fs.copyFileSync(source, destination);

  // Copy gradle.properties
  if (ctx.opts.options.release) {
    source = path.join(ctx.opts.projectRoot, 'gradle.release.properties');

  }
  else {
    source = path.join(ctx.opts.projectRoot, 'gradle.dev.properties');
  }
  destination = path.join(ctx.opts.projectRoot, 'platforms/android/app/gradle.properties');
  fs.copyFileSync(source, destination);
};
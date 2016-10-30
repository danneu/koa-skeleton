require("babel-core/register")({
  "presets": [
    "es2015",
    "stage-0"
  ]
});
require("babel-polyfill");
require('./src').start();

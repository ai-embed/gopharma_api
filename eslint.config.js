const apiConfig = require('./go_pharma_api/eslint.config.js');

module.exports = apiConfig.map((config) => {
  if (config.files) {
    return {
      ...config,
      files: config.files.map((pattern) => `go_pharma_api/${pattern}`)
    };
  }

  if (config.ignores) {
    return {
      ...config,
      ignores: config.ignores.map((pattern) => `go_pharma_api/${pattern}`)
    };
  }

  return config;
});

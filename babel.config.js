
module.exports = function(api) {
  api.cache(true);

  return {
    presets: [
      'babel-preset-expo', 
      '@babel/preset-typescript'
    ],
    plugins: [
      // Plugins recommandés pour expo-router
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
    ],
  };
};

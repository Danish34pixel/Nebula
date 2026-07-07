const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  if (config.devServer) {
    config.devServer.proxy = {
      "/api": {
        target: "http://localhost:5002",
        secure: false,
        changeOrigin: true,
        ws: false,
      },
    };
  }

  return config;
};

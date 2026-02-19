module.exports = {
  apps: [{
    name: "lifelink-backend",
    script: "./server.js",
    instances: 1,
    exec_mode: "cluster",
    watch: false,
    env: {
      NODE_ENV: "production"
    }
  }]
}

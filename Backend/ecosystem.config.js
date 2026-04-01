module.exports = {
  apps: [
    {
      name: "ml-service",
      cwd: "../ml-service",
      script: "python",
      args: "main.py",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      restart_delay: 4000,
      max_restarts: 5,
      error_file: "../logs/ml-service-error.log",
      out_file: "../logs/ml-service-out.log",
      env: {
        PYTHONUNBUFFERED: 1,
        PORT: 8000
      }
    },
    {
      name: "lifelink-backend",
      script: "./server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
}

module.exports = {
  apps: [
    {
      name: "abamba-backend",
      script: "src/app.js",
      instances: process.env.PM2_INSTANCES || "max", // Scale across all available CPU cores
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      exp_backoff_restart_delay: 100,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};

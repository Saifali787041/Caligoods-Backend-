// PM2 process definition. Start with:  pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'caligoods-api',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 'max',            // one worker per CPU core (cluster mode)
      exec_mode: 'cluster',
      autorestart: true,           // restart on crash
      max_restarts: 10,
      min_uptime: '10s',           // must stay up 10s to count as a good start
      max_memory_restart: '500M',  // restart a worker if it exceeds 500MB
      watch: false,
      kill_timeout: 5000,          // give graceful shutdown time to drain
      env: { NODE_ENV: 'production' },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};

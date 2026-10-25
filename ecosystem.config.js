// PM2 ecosystem configuration for Campus Lost & Found
// Used by both the Ansible playbook and local development.
// See: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name:         'campus-lost-found',
      script:       'app.js',
      instances:    1,
      exec_mode:    'fork',
      watch:        false,
      env: {
        NODE_ENV: 'production',
        PORT:     3000,
      },
      // Let systemd (via pm2-runtime) handle restarts — do not use PM2's own
      // crash-restart loop so that systemd remains the single supervisor.
      autorestart:  false,
      // Log files for troubleshooting on the server.
      out_file:     '/var/log/campus-lost-found/app-out.log',
      error_file:   '/var/log/campus-lost-found/app-err.log',
      merge_logs:   true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

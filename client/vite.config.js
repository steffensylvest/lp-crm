import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';

// Suppress the "[vite] http proxy error" terminal noise that appears when the
// backend server is not running. The UI handles this gracefully via the offline
// banner, so there is nothing useful for the developer to act on here.
const logger = createLogger();
const originalError = logger.error.bind(logger);
logger.error = (msg, options) => {
  if (msg.includes('http proxy error')) return;
  originalError(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {}); // prevent unhandled-error crashes
        },
      },
    },
  },
});

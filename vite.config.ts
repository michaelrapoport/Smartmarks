import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import bodyParser from 'body-parser';
import { getModelsHandler, invokeModelHandler } from './server/api.js';

function bedrockPlugin() {
  return {
    name: 'bedrock-plugin',
    configureServer(server) {
      server.middlewares.use(bodyParser.json());

      server.middlewares.use('/api/bedrock-models', async (req, res, next) => {
        if (req.method !== 'GET') return next();
        return getModelsHandler(req, res);
      });

      server.middlewares.use('/api/bedrock-invoke', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        return invokeModelHandler(req, res);
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), bedrockPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

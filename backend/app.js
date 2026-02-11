import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import { vectorService } from './services/vector.js';
import chatRoutes from './routes/chat.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

if (!process.env.HF_API_KEY) {
  console.error('HF_API_KEY not defined in .env');
  process.exit(1);
}

const app = express();

async function checkConnections() {
  const isConnected = await vectorService.checkConnection();
  if (!isConnected) {
    process.exit(1);
  }
}

checkConnections();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (_, res) => {
  res.render('index');
});

app.use('/', chatRoutes);

app.listen(PORT, () => {
  console.log(`App listening on http://localhost:${PORT}`);
});

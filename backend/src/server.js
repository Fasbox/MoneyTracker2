// Cargar .env ANTES de importar cualquier otro módulo
import 'dotenv/config';

import app from './app.js';

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API on :${port}`));

// dotenv MUST be loaded before any other import that reads process.env.
// override: true ensures .env always wins over Windows/shell environment variables.
// This prevents stale or incorrect system-level values from taking effect.
import dotenv from 'dotenv';
dotenv.config({ override: true });

import app from './app';
import { startImmunizationScheduler } from './services/immunizationScheduler';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server]: API running at http://localhost:${PORT}`);
  startImmunizationScheduler();
});

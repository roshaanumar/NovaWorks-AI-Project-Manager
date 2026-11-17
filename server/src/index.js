import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.listen(PORT, () => {
  console.log(`✅ NovaWorks Server listening on port ${PORT}`);
  console.log(`🔗 Allowed Client Origin: ${CLIENT_ORIGIN}`);
});

export default app;

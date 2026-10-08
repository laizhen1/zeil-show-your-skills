import { createApp } from './src/server.mjs';

createApp().listen(Number(process.env.PORT || 4173));

import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import errorMiddleware from './middleware/error-middleware';
import DatabaseService from './services/database-service';

(async () => {
  try {
    const db = new DatabaseService();

    await db.setup();
    const app = express();
    const port = process.env.PORT;

    if (!port) {
      throw new Error('PORT is not set');
    }
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes will go here
    app.use(errorMiddleware);

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
})();

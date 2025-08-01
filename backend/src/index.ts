import cors from 'cors';
import 'dotenv/config';
import express from 'express';

const app = express();
const port = process.env.PORT;

if (!port) {
  throw new Error('PORT is not set');
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

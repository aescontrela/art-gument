import { Router } from 'express';
import chatRoutes from './chat-route';

const router = Router();

router.use('/chat', chatRoutes);

export default router;

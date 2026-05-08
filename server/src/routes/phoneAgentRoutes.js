import express from 'express';
import PhoneAgentController from '../controllers/phoneAgentController.js';
import { requirePhoneAgent } from '../middleware/requirePhoneAgent.js';

const router = express.Router();

router.use(requirePhoneAgent);

router.post('/sessions', PhoneAgentController.createSession);
router.get('/sessions/:id/context', PhoneAgentController.getContext);
router.post('/sessions/:id/events', PhoneAgentController.postEvent);
router.post('/sessions/:id/finalize', PhoneAgentController.finalize);

export default router;


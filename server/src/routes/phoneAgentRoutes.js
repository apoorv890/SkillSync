import express from 'express';
import PhoneAgentController from '../controllers/phoneAgentController.js';
import PhoneAgentCalendarController from '../controllers/phoneAgentCalendarController.js';
import { requirePhoneAgent } from '../middleware/requirePhoneAgent.js';

const router = express.Router();

router.use(requirePhoneAgent);

router.post('/sessions', PhoneAgentController.createSession);
router.get('/sessions/:id/context', PhoneAgentController.getContext);
router.get(
  '/calls/:callSid/application-context',
  PhoneAgentController.getApplicationContextByCallSid
);
router.post('/calls/:callSid/start', PhoneAgentController.markCallStarted);
router.post('/calls/:callSid/end', PhoneAgentController.markCallEnded);
router.get('/applications/:applicationId/context', PhoneAgentController.getApplicationContext);
router.post('/sessions/:id/events', PhoneAgentController.postEvent);
router.post('/sessions/:id/finalize', PhoneAgentController.finalize);

router.get('/time', PhoneAgentCalendarController.nowIst);
router.get('/calendar/availability', PhoneAgentCalendarController.availability);
router.post('/calendar/schedule', PhoneAgentCalendarController.schedule);

export default router;


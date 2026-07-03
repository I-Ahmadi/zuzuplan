import express from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import * as projectController from "../controllers/projectController.js";
import * as projectValidators from '../validators/projectValidators.js';

const router = express.Router();

router.get("/invites/:token", projectValidators.token, validate, projectController.getInviteByToken);

router.use(authenticate);

router.get("/", projectValidators.listProjects, validate, projectController.listProjects);
router.post("/invites/:token/accept", projectValidators.token, validate, projectController.acceptInvite);
router.post("/", projectValidators.createProject, validate, projectController.createProject);
router.get("/:id", projectValidators.projectId, validate, projectController.getProjectById);
router.put("/:id", projectValidators.updateProject, validate, projectController.updateProject);
router.delete("/:id", projectValidators.projectId, validate, projectController.removeProject);
router.get("/:id/members", projectValidators.projectId, validate, projectController.getMembers);
router.post("/:id/members", projectValidators.addMember, validate, projectController.addMember);
router.put("/:id/members/:userId", projectValidators.updateMemberRole, validate, projectController.updateMemberRole);
router.delete("/:id/members/:userId", projectValidators.removeMember, validate, projectController.removeMember);
router.get("/:id/invites", projectValidators.projectId, validate, projectController.getInvites);
router.post("/:id/invites", projectValidators.createInvite, validate, projectController.createInvite);
router.delete("/:id/invites/:inviteId", projectValidators.revokeInvite, validate, projectController.revokeInvite);

export default router;

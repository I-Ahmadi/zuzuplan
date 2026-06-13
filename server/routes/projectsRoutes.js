import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  requireProjectAccess,
  requireProjectAdmin,
} from "../middleware/authorization.js";
import { validate } from "../middleware/validation.js";
import * as projectController from "../controllers/projectController.js";
import * as projectValidators from '../validators/projectValidators.js';

const router = express.Router();

router.use(authenticate);

router.get("/", projectValidators.listProjects, validate, projectController.listProjects);
router.get("/invites/:token", projectValidators.token, validate, projectController.getInviteByToken);
router.post("/invites/:token/accept", projectValidators.token, validate, projectController.acceptInvite);
router.post("/", projectValidators.createProject, validate, projectController.createProject);
router.get("/:id", projectValidators.projectId, validate, requireProjectAccess(), projectController.getProjectById);
router.put("/:id", projectValidators.updateProject, validate, requireProjectAdmin(), projectController.updateProject);
router.delete("/:id", projectValidators.projectId, validate, requireProjectAdmin(), projectController.removeProject);
router.get("/:id/members", projectValidators.projectId, validate, requireProjectAccess(), projectController.getMembers);
router.post("/:id/members", projectValidators.addMember, validate, requireProjectAdmin(), projectController.addMember);
router.put("/:id/members/:userId", projectValidators.updateMemberRole, validate, requireProjectAdmin(), projectController.updateMemberRole);
router.delete("/:id/members/:userId", projectValidators.removeMember, validate, requireProjectAdmin(), projectController.removeMember);
router.get("/:id/invites", projectValidators.projectId, validate, requireProjectAccess(), projectController.getInvites);
router.post("/:id/invites", projectValidators.createInvite, validate, requireProjectAdmin(), projectController.createInvite);
router.delete("/:id/invites/:inviteId", projectValidators.revokeInvite, validate, requireProjectAdmin(), projectController.revokeInvite);
router.get("/:id/stats", projectValidators.stats, validate, requireProjectAccess(), projectController.getStats);

export default router;

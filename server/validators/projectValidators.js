import { body, param, query } from "express-validator";
import { ROLES } from "../utils/constants.js";

export const listProjects = [
  query("page")
    .optional()
    .isInt({ min: 1 }),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }),

  query("status")
    .optional()
    .isIn(["active", "archived", "completed"]),
];

export const projectId = [
  param("id").isUUID(),
];

export const member = [
  param("id").isUUID(),
  param("userId").isUUID(),
];

export const invite = [
  param("id").isUUID(),
  param("inviteId").isUUID(),
];

export const token = [
  param("token").notEmpty(),
];

export const createProject = [
  body("name").trim().notEmpty(),

  body("key")
    .trim()
    .notEmpty()
    .isLength({ max: 10 }),

  body("description").optional().trim(),

  body("status")
    .optional()
    .isIn(["active", "archived", "completed"]),

  body("visibility")
    .optional()
    .isIn(["private", "public"]),

  body("startDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601(),

  body("endDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601(),
];

export const updateProject = [
  param("id").isUUID(),

  body("name").optional().trim().notEmpty(),

  body("key").optional().trim().isLength({ max: 10 }),

  body("description").optional().trim(),

  body("status")
    .optional()
    .isIn(["active", "archived", "completed"]),

  body("visibility")
    .optional()
    .isIn(["private", "public"]),

  body("startDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601(),

  body("endDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601(),
];

export const addMember = [
  param("id").isUUID(),

  body("userId").isUUID(),

  body("role")
    .optional()
    .isIn(Object.values(ROLES)),
];

export const updateMemberRole = [
  param("id").isUUID(),
  param("userId").isUUID(),

  body("role").isIn(Object.values(ROLES)),
];

export const createInvite = [
  param("id").isUUID(),

  body("email").isEmail().normalizeEmail(),

  body("role")
    .optional()
    .isIn(Object.values(ROLES)),
];

export const removeMember = [
  param("id").isUUID(),
  param("userId").isUUID(),
];

export const revokeInvite = [
  param("id").isUUID(),
  param("inviteId").isUUID(),
];

export const stats = [
  param("id").isUUID(),
];

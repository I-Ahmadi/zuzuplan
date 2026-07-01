import { body, param, query } from "express-validator";
import { ROLES } from "../utils/constants.js";

export const listProjects = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(["active", "archived", "completed"]),

  query("visibility")
    .optional()
    .isIn(["private", "public"]),

  query("search")
    .optional()
    .trim(),

  query("fields")
    .optional()
    .isIn(["list", "switcher"]),
];

export const projectId = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),

  query("fields")
    .optional()
    .isIn(["detail", "planning", "team", "edit", "switcher"]),
];

export const member = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),
  param("userId")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("User id must be a valid id"),
];

export const invite = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),
  param("inviteId")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Invite id must be a valid id"),
];

export const token = [
  param("token").notEmpty(),
];

export const createProject = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

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
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),

  body("endDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date"),
];

export const updateProject = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),

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
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),

  body("endDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date"),
];

export const addMember = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),

  body("userId")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("User id must be a valid id"),

  body("role")
    .optional()
    .isIn(Object.values(ROLES)),
];

export const updateMemberRole = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),
  param("userId")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("User id must be a valid id"),

  body("role").isIn(Object.values(ROLES)),
];

export const createInvite = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),

  body("email").isEmail().normalizeEmail(),

  body("role")
    .optional()
    .isIn(Object.values(ROLES)),
];

export const removeMember = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),
  param("userId")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("User id must be a valid id"),
];

export const revokeInvite = [
  param("id")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Project id must be a valid id"),
  param("inviteId")
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage("Invite id must be a valid id"),
];

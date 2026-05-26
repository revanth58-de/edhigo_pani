/**
 * enums.js — D1: Centralised domain constants
 *
 * Single source of truth for every status/type string used across the backend.
 * Importing from here means a typo causes a runtime ReferenceError
 * instead of silently failing a DB query.
 *
 * Usage:
 *   const { JobStatus, PaymentStatus, UserStatus } = require('./enums');
 *   await prisma.job.update({ where: { id }, data: { status: JobStatus.COMPLETED } });
 *
 * Prisma still stores these as plain strings (no PostgreSQL enum type change
 * needed), so there is zero migration risk and the values are identical to
 * what was already in the DB.
 */

// ── Job ────────────────────────────────────────────────────────────────────────
const JobStatus = Object.freeze({
  PENDING:     'pending',
  MATCHED:     'matched',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  CANCELLED:   'cancelled',

  /** All statuses that represent a live/open job */
  LIVE: ['pending', 'matched', 'in_progress'],
});

const WorkType = Object.freeze({
  SOWING:     'sowing',
  HARVESTING: 'harvesting',
  IRRIGATION: 'irrigation',
  LABOUR:     'labour',
  TRACTOR:    'tractor',

  ALL: ['sowing', 'harvesting', 'irrigation', 'labour', 'tractor'],
});

const WorkerType = Object.freeze({
  INDIVIDUAL: 'individual',
  GROUP:      'group',
});

// ── User ───────────────────────────────────────────────────────────────────────
const UserRole = Object.freeze({
  FARMER: 'farmer',
  WORKER: 'worker',
  LEADER: 'leader',

  VALID: ['farmer', 'worker', 'leader'],
});

const UserStatus = Object.freeze({
  AVAILABLE: 'available',
  WORKING:   'working',
  ON_BREAK:  'on_break',
  OFFLINE:   'offline',

  /** Statuses that count as "online" for job matching */
  ONLINE: ['available', 'online'],   // legacy 'online' string kept for back-compat
});

const Gender = Object.freeze({
  MALE:   'male',
  FEMALE: 'female',
  OTHER:  'other',

  VALID: ['male', 'female', 'other'],
});

const Language = Object.freeze({
  TELUGU:  'te',
  HINDI:   'hi',
  ENGLISH: 'en',

  VALID: ['te', 'hi', 'en'],
});

// ── Payment ────────────────────────────────────────────────────────────────────
const PaymentStatus = Object.freeze({
  PENDING:   'pending',
  COMPLETED: 'completed',
  FAILED:    'failed',
});

const PaymentMethod = Object.freeze({
  CASH: 'cash',
  UPI:  'upi',
});

// ── Group ──────────────────────────────────────────────────────────────────────
const GroupStatus = Object.freeze({
  FORMING:   'forming',
  ACTIVE:    'active',
  COMPLETED: 'completed',

  VALID: ['forming', 'active', 'completed'],
});

const MemberStatus = Object.freeze({
  INVITED:     'invited',
  JOINED:      'joined',
  CHECKED_IN:  'checked_in',
  CHECKED_OUT: 'checked_out',
});

// ── Job Application ────────────────────────────────────────────────────────────
const ApplicationStatus = Object.freeze({
  PENDING:   'pending',
  ACCEPTED:  'accepted',
  REJECTED:  'rejected',
  WITHDRAWN: 'withdrawn',
});

// ── Rating ─────────────────────────────────────────────────────────────────────
const RatingEmoji = Object.freeze({
  HAPPY:   'happy',
  NEUTRAL: 'neutral',
  SAD:     'sad',

  VALID: ['happy', 'neutral', 'sad'],
});

module.exports = {
  JobStatus,
  WorkType,
  WorkerType,
  UserRole,
  UserStatus,
  Gender,
  Language,
  PaymentStatus,
  PaymentMethod,
  GroupStatus,
  MemberStatus,
  ApplicationStatus,
  RatingEmoji,
};

/**
 * Model Barrel Export
 *
 * Centralizes all model imports so the rest of the codebase
 * imports from one place instead of individual model paths.
 *
 * BEFORE (without barrel):
 *   const User           = require('../models/User');
 *   const MedicalReport  = require('../models/MedicalReport');
 *   const ChatHistory    = require('../models/ChatHistory');
 *
 * AFTER (with barrel):
 *   const { User, MedicalReport, ChatHistory } = require('../models');
 *
 * BENEFIT: If a model file is renamed or moved, only this file needs updating —
 * not every controller that imports it.
 */

const User             = require('./User');
const MedicalReport    = require('./MedicalReport');
const ChatHistory      = require('./ChatHistory');
const MedicineReminder = require('./MedicineReminder');
const Appointment      = require('./Appointment');
const HealthReading    = require('./HealthReading');
const EmergencyContact = require('./EmergencyContact');
const WaterIntake = require('./WaterIntake');
module.exports = {

  User,
  MedicalReport,
  ChatHistory,
  MedicineReminder,
  Appointment,
  HealthReading,
  EmergencyContact,
  WaterIntake

};
/**
 * Emergency Contact Controller
 *
 * HTTP layer for emergency contact management.
 *
 * ENDPOINTS:
 *   GET    /api/emergency              → List all contacts (primary first)
 *   POST   /api/emergency              → Add a contact
 *   GET    /api/emergency/:id          → Get one contact
 *   PUT    /api/emergency/:id          → Update contact
 *   DELETE /api/emergency/:id          → Delete contact
 *   PATCH  /api/emergency/:id/primary  → Set as primary contact
 */

const GoogleMapsService = require("../services/googleMaps.service");
const EmergencyService = require('../services/emergency.service');
const { sendSuccess }  = require('../utils/response.utils');
const asyncWrapper     = require('../utils/asyncWrapper');

// GET /api/emergency
exports.getContacts = asyncWrapper(async (req, res) => {
  const contacts = await EmergencyService.getUserContacts(req.user._id);

  return sendSuccess(
    res,
    { contacts, count: contacts.length },
    'Emergency contacts retrieved successfully.'
  );
});

// POST /api/emergency
exports.addContact = asyncWrapper(async (req, res) => {
  const contact = await EmergencyService.addContact(req.user._id, req.body);

  return sendSuccess(
    res,
    { contact },
    'Emergency contact added successfully.',
    201
  );
});

const getNearbyHospitals = async (req, res, next) => {

    try {

        const { lat, lng } = req.query;

        if (!lat || !lng) {

            return res.status(400).json({
                success: false,
                message: "Latitude and Longitude are required."
            });

        }

        const hospitals =
            await GoogleMapsService.getNearbyHospitals(lat, lng);

        res.status(200).json({

            success: true,

            count: hospitals.length,

            hospitals

        });

    } catch (err) {

        next(err);

    }

};



// GET /api/emergency/:id
exports.getContactById = asyncWrapper(async (req, res) => {
  const contact = await EmergencyService.getContactById(req.user._id, req.params.id);

  return sendSuccess(res, { contact }, 'Emergency contact retrieved successfully.');
});

// PUT /api/emergency/:id
exports.updateContact = asyncWrapper(async (req, res) => {
  const contact = await EmergencyService.updateContact(
    req.user._id,
    req.params.id,
    req.body
  );

  return sendSuccess(res, { contact }, 'Emergency contact updated successfully.');
});

// DELETE /api/emergency/:id
exports.deleteContact = asyncWrapper(async (req, res) => {
  await EmergencyService.deleteContact(req.user._id, req.params.id);

  return sendSuccess(res, null, 'Emergency contact deleted successfully.');
});

// PATCH /api/emergency/:id/primary
exports.setPrimary = asyncWrapper(async (req, res) => {
  const contact = await EmergencyService.setPrimaryContact(req.user._id, req.params.id);

  return sendSuccess(
    res,
    { contact },
    `"${contact.name}" is now your primary emergency contact.`
  );
});


// GET /api/emergency/nearby-hospitals
exports.getNearbyHospitals = asyncWrapper(async (req, res) => {

    const { lat, lng } = req.query;

    if (!lat || !lng) {

        return res.status(400).json({
            success: false,
            message: "Latitude and Longitude are required."
        });

    }

    const hospitals = await GoogleMapsService.getNearbyHospitals(lat, lng);

    return sendSuccess(

        res,

        {
            hospitals,
            count: hospitals.length
        },

        "Nearby hospitals retrieved successfully."

    );

});

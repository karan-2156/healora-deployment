const crypto = require("crypto");

/**
 * Generate a secure 6-digit OTP
 */
const generateOTP = () => {

    const otp = crypto.randomInt(100000, 1000000);

    return otp.toString();

};

/**
 * OTP expiry time (10 minutes)
 */
const getOTPExpiry = () => {

    return new Date(Date.now() + 10 * 60 * 1000);

};

module.exports = {

    generateOTP,
    getOTPExpiry

};
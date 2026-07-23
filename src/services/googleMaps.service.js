const axios = require("axios");

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const getNearbyHospitals = async (latitude, longitude) => {

    const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${latitude},${longitude}` +
        `&radius=5000` +
        `&type=hospital` +
        `&key=${GOOGLE_API_KEY}`;

    const { data } = await axios.get(url);

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(data.error_message || data.status);
    }

    return data.results.map(place => ({
        name: place.name,
        rating: place.rating || "N/A",
        address: place.vicinity,
        location: place.geometry.location,
        placeId: place.place_id,
        openNow:
            place.opening_hours?.open_now ?? null
    }));
};

module.exports = {
    getNearbyHospitals
};
// Guest-facing hotel details are maintained here so they do not spread across pages.
export const GUEST_HOTEL_CONFIG = {
  wifi: {
    networkId: "Monti Hotel Guest",
    password: "Kontaktirajte recepciju",
    // Change to true once an actual guest Wi-Fi password is supplied.
    passwordAvailable: false,
  },
  openingHours: [
    { id: "restaurant", hours: "07:00–23:00" },
    { id: "breakfast", hours: "07:00–10:00" },
    { id: "wellness", hours: "09:00–21:00" },
    { id: "massages", hours: "10:00–20:00" },
    { id: "reception", hours: "00:00–24:00" },
  ],
  location: {
    latitude: 43.73,
    longitude: 18.29,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Monti%20Hotel%20%26%20Wellness%2C%20Igman",
  },
};

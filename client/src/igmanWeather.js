const IGMAN_WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=43.73&longitude=18.29&current=temperature_2m,weather_code";

export async function fetchIgmanWeather(signal) {
  const response = await fetch(IGMAN_WEATHER_URL, { signal });
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
  const data = await response.json();
  const temperature = data?.current?.temperature_2m;
  if (!Number.isFinite(temperature)) throw new Error("Weather temperature is unavailable");
  return { temperature: Math.round(temperature), code: Number(data.current.weather_code) };
}

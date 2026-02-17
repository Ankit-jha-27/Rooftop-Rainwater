export interface RainfallResult {
  year: number;
  latitude: number;
  longitude: number;
  totalRainfallMM: number;
  dailyData: Record<string, number>;
}

export async function getYearlyRainfall(
  lat: number,
  lon: number,
  year: number
): Promise<RainfallResult> {
  const start = `${year}0101`;
  const end = `${year}1231`;

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&start=${start}&end=${end}&latitude=${lat}&longitude=${lon}&community=AG&format=JSON`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const json = await response.json();
  const dailyData: Record<string, number> =
    json?.properties?.parameter?.PRECTOTCORR;

  if (!dailyData) {
    throw new Error("Rainfall data not available from NASA POWER.");
  }

  const totalRainfallMM = Object.values(dailyData)
    .map(Number)
    .reduce((sum, x) => sum + x, 0);

  return {
    year,
    latitude: lat,
    longitude: lon,
    totalRainfallMM,
    dailyData,
  };
}

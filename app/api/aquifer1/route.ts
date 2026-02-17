import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { point, booleanPointInPolygon, bbox } from "@turf/turf";

let features: any[] = [];

// Load GeoJSON once
function loadGeoJSON() {
  if (features.length > 0) return;

  const filePath = path.join(process.cwd(), "public", "PrincipalAquifer.geojson");
  const geojson = JSON.parse(fs.readFileSync(filePath, "utf8"));

  features = geojson.features.map((f: any) => ({
    feature: f,
    bbox: bbox(f),
  }));
}

function findAquifer(lon: number, lat: number) {
  const p = point([lon, lat]);

  for (const { feature, bbox } of features) {
    const [minX, minY, maxX, maxY] = bbox;
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;

    if (booleanPointInPolygon(p, feature)) {
      return (
        feature.properties?.NAME ||
        feature.properties?.name ||
        feature.properties?.Aquifer ||
        "Unknown Aquifer"
      );
    }
  }

  return null;
}

// ---------------- API HANDLER ----------------
export async function GET(req: NextRequest) {
  loadGeoJSON();

  const latStr = req.nextUrl.searchParams.get("lat");
  const lonStr = req.nextUrl.searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const aquifer = findAquifer(lon, lat);

  return NextResponse.json({
    lat,
    lon,
    aquifer,
  });
}

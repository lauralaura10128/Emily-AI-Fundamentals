/**
 * Curated collection of landscape photos from Unsplash.
 * Each ID was verified to resolve to a real image.
 * The URL params ask Unsplash for a large, well-compressed JPEG so the
 * page stays sharp on big displays without downloading anything huge.
 */
const UNSPLASH_PHOTO_IDS = [
  "1506744038136-46273834b3fb", // misty lake & mountains
  "1470071459604-3b5ec3a7fe05", // foggy forest
  "1441974231531-c6227db76b6e", // sunlit forest
  "1501785888041-af3ef285b470", // lake & pines
  "1454496522488-7a8e488e8606", // starry mountains
  "1439066615861-d1af74d74000", // pine forest from above
  "1518173946687-a4c8892bbd9f", // green rolling hills
  "1472214103451-9374bd1c798e", // green valley
  "1447752875215-b2761acb3c5d", // forest path
  "1469474968028-56623f02e42e", // mountain sunrise
  "1426604966848-d7adac402bff", // valley river
  "1444927714506-8492d94b4e3d", // desert dunes
  "1490750967868-88aa4486c946", // lavender field
  "1497436072909-60f360e1d4b1", // sun through trees
  "1433086966358-54859d0ed716", // waterfall
  "1421789665209-c9b2a435e3dc", // ocean cliffs
  "1444703686981-a3abbc4d4fe3"  // mountain lake
];

/** Build a full image URL for a given photo ID, sized for the viewport. */
function buildUnsplashUrl(id, width) {
  const w = Math.min(2400, Math.max(1200, width || 1920));
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

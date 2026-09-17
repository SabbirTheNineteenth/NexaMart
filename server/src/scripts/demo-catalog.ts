export type DemoCatalogProduct = {
  brand: string;
  category: { name: string; slug: string };
  colors: string[];
  description: string;
  name: string;
  originalPrice?: string;
  primaryImageUrl: string;
  price: string;
  rating: string;
  reviewCount: number;
  slug: string;
  stock: number;
};

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const DEMO_CATALOG: DemoCatalogProduct[] = [
  { brand: "Auralis", category: { name: "Audio", slug: "audio" }, colors: ["Midnight", "Silver"], description: "Adaptive wireless headphones with balanced studio detail and all-day comfort.", name: "Auralis Orbit Headphones", originalPrice: "249.00", primaryImageUrl: image("photo-1505740420928-5e560c06d30e"), price: "199.00", rating: "4.80", reviewCount: 241, slug: "auralis-orbit-headphones", stock: 24 },
  { brand: "Auralis", category: { name: "Audio", slug: "audio" }, colors: ["Graphite"], description: "Compact portable speaker with clear vocals, deep bass, and durable travel-ready design.", name: "Auralis Roam Speaker", primaryImageUrl: image("photo-1608043152269-423dbba4e7e1"), price: "89.00", rating: "4.60", reviewCount: 118, slug: "auralis-roam-speaker", stock: 36 },
  { brand: "Vertex", category: { name: "Electronics", slug: "electronics" }, colors: ["Space Gray"], description: "Focused productivity keyboard with tactile keys, quiet operation, and a slim aluminum frame.", name: "Vertex Keyline Keyboard", primaryImageUrl: image("photo-1587829741301-dc798b83add3"), price: "129.00", rating: "4.70", reviewCount: 86, slug: "vertex-keyline-keyboard", stock: 18 },
  { brand: "Vertex", category: { name: "Electronics", slug: "electronics" }, colors: ["Black", "White"], description: "Ergonomic precision mouse designed for responsive everyday work and comfortable long sessions.", name: "Vertex Arc Mouse", primaryImageUrl: image("photo-1527814050087-3793815479db"), price: "69.00", rating: "4.50", reviewCount: 73, slug: "vertex-arc-mouse", stock: 42 },
  { brand: "Lumen", category: { name: "Home", slug: "home" }, colors: ["Ivory", "Sand"], description: "Adjustable desk lamp with a warm dimmable glow for reading, work, and evening wind-downs.", name: "Lumen Halo Desk Lamp", primaryImageUrl: image("photo-1507473885765-e6ed057f782c"), price: "99.00", rating: "4.70", reviewCount: 91, slug: "lumen-halo-desk-lamp", stock: 20 },
  { brand: "Lumen", category: { name: "Home", slug: "home" }, colors: ["Natural Oak"], description: "Minimal wall shelf with clean lines for displaying everyday objects and favorite books.", name: "Lumen Frame Wall Shelf", primaryImageUrl: image("photo-1616486338812-3dadae4b4ace"), price: "79.00", rating: "4.40", reviewCount: 54, slug: "lumen-frame-wall-shelf", stock: 15 },
  { brand: "Northline", category: { name: "Outdoors", slug: "outdoors" }, colors: ["Forest", "Stone"], description: "Insulated stainless steel bottle that keeps drinks at temperature through commutes and trails.", name: "Northline Trail Bottle", primaryImageUrl: image("photo-1602143407151-7111542de6e8"), price: "35.00", rating: "4.90", reviewCount: 167, slug: "northline-trail-bottle", stock: 60 },
  { brand: "Northline", category: { name: "Outdoors", slug: "outdoors" }, colors: ["Charcoal"], description: "Lightweight weather-resistant daypack with organized storage for city trips and weekend hikes.", name: "Northline Summit Daypack", originalPrice: "119.00", primaryImageUrl: image("photo-1553062407-98eeb64c6a62"), price: "95.00", rating: "4.60", reviewCount: 102, slug: "northline-summit-daypack", stock: 27 },
];

export const canSeedDemoCatalog = (allowDemoSeed: string | undefined) => allowDemoSeed === "true";

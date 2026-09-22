/** Development-only display plan. This module performs no database or environment work. */
export type DemoCatalogPlanProduct = Readonly<{ id: string; name: string; brand: string; category: string; subcategory: string; imageUrl: string }>;

type CategoryPlan = Readonly<{ category: string; subcategories: readonly [string, string, string]; brands: readonly string[] }>;

const CATEGORY_PLANS: readonly CategoryPlan[] = [
  { category: "Audio", subcategories: ["Headphones", "Speakers", "Microphones"], brands: ["Auralis", "Sonora", "Marlow"] },
  { category: "Computing", subcategories: ["Keyboards", "Mice", "Monitors"], brands: ["Vertex", "Pixel", "Axis"] },
  { category: "Home", subcategories: ["Decor", "Storage", "Textiles"], brands: ["Lumen", "Hearth", "Morrow"] },
  { category: "Outdoors", subcategories: ["Camping", "Hiking", "Hydration"], brands: ["Northline", "Pine", "Tern"] },
  { category: "Style", subcategories: ["Bags", "Outerwear", "Footwear"], brands: ["Aster", "Vale", "Sable"] },
  { category: "Wellness", subcategories: ["Yoga", "Recovery", "Hydration"], brands: ["Motive", "Serein", "Evo"] },
  { category: "Kitchen", subcategories: ["Cookware", "Tableware", "Drinkware"], brands: ["Brass", "Grain"] },
  { category: "Stationery", subcategories: ["Notebooks", "Writing", "Desk Tools"], brands: ["Paperline", "Nook"] },
  { category: "Pets", subcategories: ["Pet Care", "Pet Toys", "Pet Travel"], brands: ["Pawsome", "Tails"] },
  { category: "Travel", subcategories: ["Luggage", "Travel Organizers", "Travel Comfort"], brands: ["Waypoint", "Rove"] },
  { category: "Beauty", subcategories: ["Skin Care", "Hair Care", "Cosmetics"], brands: ["Bloom", "Verve", "Solenne"] },
  { category: "Groceries", subcategories: ["Pantry", "Beverages", "Snacks"], brands: ["Harvest", "Goodfield", "Daily"] },
  { category: "Baby", subcategories: ["Nursery", "Feeding", "Baby Travel"], brands: ["Littleleaf", "Nestling", "Sprout"] },
  { category: "Books", subcategories: ["Fiction", "Nonfiction", "Children's Books"], brands: ["Chapter", "Quill"] },
  { category: "Fitness", subcategories: ["Training", "Running", "Strength"], brands: ["Stride", "Coreform"] },
  { category: "Garden", subcategories: ["Planters", "Garden Tools", "Seeds"], brands: ["Greenhouse", "Rooted"] },
  { category: "Gaming", subcategories: ["Controllers", "Gaming Audio", "Gaming Accessories"], brands: ["Arcade", "Playfield", "Level"] },
  { category: "Photography", subcategories: ["Cameras", "Lenses", "Camera Bags"], brands: ["Frame", "Aperture"] },
  { category: "Automotive", subcategories: ["Car Care", "Car Storage", "Road Safety"], brands: ["Roadwell", "Mile"] },
  { category: "Bedding", subcategories: ["Sheets", "Pillows", "Blankets"], brands: ["Cloudrest", "Linen"] },
  { category: "Laundry", subcategories: ["Laundry Care", "Laundry Storage", "Ironing"], brands: ["Freshfold", "Tidy"] },
  { category: "Lighting", subcategories: ["Desk Lighting", "Ambient Lighting", "Outdoor Lighting"], brands: ["Halo", "Glow"] },
  { category: "Furniture", subcategories: ["Seating", "Tables", "Shelving"], brands: ["Form", "Oak"] },
  { category: "Office", subcategories: ["Desk Accessories", "Office Storage", "Ergonomics"], brands: ["Workline", "Ledger"] },
  { category: "Accessories", subcategories: ["Watches", "Eyewear", "Everyday Carry"], brands: ["Meridian", "Cove"] },
];

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const productSuffixes = ["Essential", "Everyday"] as const;
const imageFor = (index: number) => `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80&sig=${index + 1}`;

export const DEMO_CATALOG_SEED_PLAN: readonly DemoCatalogPlanProduct[] = CATEGORY_PLANS.flatMap((plan, categoryIndex) =>
  Array.from({ length: 6 }, (_, productIndex) => {
    const subcategory = plan.subcategories[productIndex % plan.subcategories.length]!;
    const brand = plan.brands[productIndex % plan.brands.length]!;
    const ordinal = `${productIndex + 1}`.padStart(2, "0");
    return {
      id: `demo-${slugify(plan.category)}-${ordinal}`,
      name: `${brand} ${subcategory} ${productSuffixes[Math.floor(productIndex / 3)]}`,
      brand,
      category: plan.category,
      subcategory,
      imageUrl: imageFor(categoryIndex * 6 + productIndex),
    };
  }),
);

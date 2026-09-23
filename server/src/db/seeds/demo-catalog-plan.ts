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
// Deterministic, category-searched source paths. A display query must never be used
// as the only distinction between two catalog images.
const DEMO_IMAGE_SOURCES = [
  "https://plus.unsplash.com/premium_photo-1682125853703-896a05629709", "https://images.unsplash.com/photo-1618609377864-68609b857e90", "https://images.unsplash.com/photo-1602475063211-3d98d60e3b1f", "https://images.unsplash.com/photo-1483000805330-4eaf0a0d82da", "https://plus.unsplash.com/premium_photo-1677545820818-f1639f3e5b65", "https://images.unsplash.com/photo-1605731414532-6b26976cc153",
  "https://plus.unsplash.com/premium_photo-1687892170417-f9a11a402ef7", "https://images.unsplash.com/photo-1542831371-29b0f74f9713", "https://images.unsplash.com/photo-1619410283995-43d9134e7656", "https://images.unsplash.com/photo-1607799279861-4dd421887fb3", "https://plus.unsplash.com/premium_photo-1661878265739-da90bc1af051", "https://images.unsplash.com/photo-1515879218367-8466d910aaa4",
  "https://plus.unsplash.com/premium_photo-1689609950112-d66095626efb", "https://images.unsplash.com/photo-1570129477492-45c003edd2be", "https://images.unsplash.com/photo-1618220179428-22790b461013", "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83", "https://plus.unsplash.com/premium_photo-1661964014750-963a28aeddea", "https://images.unsplash.com/photo-1505691723518-36a5ac3be353",
  "https://plus.unsplash.com/premium_photo-1698501025839-25d2e63dc9a4", "https://images.unsplash.com/photo-1543039625-14cbd3802e7d", "https://images.unsplash.com/photo-1528364226066-ec76a960030b", "https://images.unsplash.com/photo-1476041026529-411f6ae1de3e", "https://plus.unsplash.com/premium_photo-1669377593274-41985c518d03", "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd",
  "https://plus.unsplash.com/premium_photo-1664202526559-e21e9c0fb46a", "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f", "https://images.unsplash.com/photo-1483985988355-763728e1935b", "https://images.unsplash.com/photo-1529139574466-a303027c1d8b", "https://plus.unsplash.com/premium_photo-1675186049419-d48f4b28fe7c", "https://images.unsplash.com/photo-1557777586-f6682739fcf3",
  "https://images.unsplash.com/photo-1594058573823-d8edf1ad3380", "https://plus.unsplash.com/premium_photo-1675195905377-e78fccd629c9", "https://images.unsplash.com/photo-1535914254981-b5012eebbd15", "https://images.unsplash.com/photo-1562751362-404243c2eea3", "https://plus.unsplash.com/premium_photo-1664299353570-8806eb1de970", "https://images.unsplash.com/photo-1600618528240-fb9fc964b853",
  "https://plus.unsplash.com/premium_photo-1680382578857-c331ead9ed51", "https://images.unsplash.com/photo-1600489000022-c2086d79f9d4", "https://images.unsplash.com/photo-1556911220-bff31c812dba", "https://images.unsplash.com/photo-1617228069096-4638a7ffc906", "https://plus.unsplash.com/premium_photo-1678375722686-c7ea507c3003", "https://images.unsplash.com/photo-1565538810643-b5bdb714032a",
  "https://plus.unsplash.com/premium_photo-1726399099736-2255ab026b7a", "https://images.unsplash.com/photo-1654931800100-2ecf6eee7c64", "https://images.unsplash.com/photo-1631173716529-fd1696a807b0", "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3", "https://plus.unsplash.com/premium_photo-1664110691134-df4aa034c322", "https://images.unsplash.com/photo-1612599316791-451087c7fe15",
  "https://plus.unsplash.com/premium_photo-1666777247416-ee7a95235559", "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35", "https://images.unsplash.com/photo-1450778869180-41d0601e046e", "https://images.unsplash.com/photo-1548199973-03cce0bbc87b", "https://plus.unsplash.com/premium_photo-1694819488591-a43907d1c5cc", "https://images.unsplash.com/photo-1583337130417-3346a1be7dee",
  "https://images.unsplash.com/photo-1707344088547-3cf7cea5ca49", "https://plus.unsplash.com/premium_photo-1677343210638-5d3ce6ddbf85", "https://images.unsplash.com/photo-1500835556837-99ac94a94552", "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1", "https://plus.unsplash.com/premium_photo-1719843013722-c2f4d69db940", "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
  "https://plus.unsplash.com/premium_photo-1710965560034-778eedc929ff", "https://images.unsplash.com/photo-1582639590011-f5a8416d1101", "https://images.unsplash.com/photo-1551184451-76b762941ad6", "https://images.unsplash.com/photo-1620053580376-3de604e91953", "https://plus.unsplash.com/premium_photo-1711434824963-ca894373272e", "https://images.unsplash.com/photo-1596462502278-27bfdc403348",
  "https://images.unsplash.com/photo-1556741533-f6acd6474059", "https://plus.unsplash.com/premium_photo-1683121938935-118d0a16a469", "https://images.unsplash.com/photo-1542838132-92c53300491e", "https://images.unsplash.com/photo-1628102491629-778571d893a3", "https://plus.unsplash.com/premium_photo-1664305032567-2c460e29dec1", "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9",
  "https://plus.unsplash.com/premium_photo-1676049342411-c118fe1570b2", "https://images.unsplash.com/photo-1510154221590-ff63e90a136f", "https://images.unsplash.com/photo-1617331140180-e8262094733a", "https://images.unsplash.com/photo-1533483595632-c5f0e57a1936", "https://plus.unsplash.com/premium_photo-1664474430762-f5201ecb6c43", "https://images.unsplash.com/photo-1470116945706-e6bf5d5a53ca",
  "https://plus.unsplash.com/premium_photo-1669652639337-c513cc42ead6", "https://images.unsplash.com/photo-1610116306796-6fea9f4fae38", "https://images.unsplash.com/photo-1694730750153-8b66cf3dd014", "https://plus.unsplash.com/premium_photo-1677187301660-5e557d9c0724", "https://images.unsplash.com/photo-1604866830893-c13cafa515d5", "https://images.unsplash.com/photo-1680973543493-6c03e66402fe",
  "https://images.unsplash.com/photo-1627483298606-cf54c61779a9", "https://plus.unsplash.com/premium_photo-1670505062582-fdaa83c23c9e", "https://images.unsplash.com/photo-1517836357463-d25dfeac3438", "https://images.unsplash.com/photo-1534438327276-14e5300c3a48", "https://plus.unsplash.com/premium_photo-1661301057249-bd008eebd06a", "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5",
  "https://plus.unsplash.com/premium_photo-1673141390230-8b4a3c3152b1", "https://images.unsplash.com/photo-1778683326192-898fc982e6a6", "https://images.unsplash.com/photo-1601654253194-260e0b6984f9", "https://images.unsplash.com/photo-1723053140058-7aa2e74ac794", "https://plus.unsplash.com/premium_photo-1661963333824-fd020faec5fc", "https://images.unsplash.com/photo-1591383496652-db773e57b1d0",
  "https://plus.unsplash.com/premium_photo-1677870728119-52aef052d7ef", "https://images.unsplash.com/photo-1542751371-adc38448a05e", "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf", "https://images.unsplash.com/photo-1511512578047-dfb367046420", "https://plus.unsplash.com/premium_photo-1674374443275-20dae04975ac", "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8",
  "https://images.unsplash.com/photo-1779896412186-441e30764c8c", "https://plus.unsplash.com/premium_photo-1674389991678-0836ca77c7f7", "https://images.unsplash.com/photo-1542038784456-1ea8e935640e", "https://images.unsplash.com/photo-1495745966610-2a67f2297e5e", "https://plus.unsplash.com/premium_photo-1673448391005-d65e815bd026", "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8",
  "https://plus.unsplash.com/premium_photo-1686730540270-93f2c33351b6", "https://images.unsplash.com/photo-1503376780353-7e6692767b70", "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7", "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a", "https://plus.unsplash.com/premium_photo-1664303847960-586318f59035", "https://images.unsplash.com/photo-1567789884554-0b844b597180",
  "https://plus.unsplash.com/premium_photo-1675537843200-78c1a0ea1736", "https://images.unsplash.com/photo-1564019472231-4586c552dc27", "https://images.unsplash.com/photo-1601276174812-63280a55656e", "https://images.unsplash.com/photo-1635594202056-9ea3b497e5c0", "https://plus.unsplash.com/premium_photo-1673942750147-87233d9f29d5", "https://images.unsplash.com/photo-1536349788264-1b816db3cc13",
  "https://plus.unsplash.com/premium_photo-1664372899525-d99a419fd21a", "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c", "https://images.unsplash.com/photo-1582735689369-4fe89db7114c", "https://images.unsplash.com/photo-1604335398980-ededcadcc37d", "https://plus.unsplash.com/premium_photo-1664372899366-d5fb20b332d1", "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1",
  "https://plus.unsplash.com/premium_photo-1667544928728-ab4bfed4648c", "https://images.unsplash.com/photo-1606170033648-5d55a3edf314", "https://images.unsplash.com/photo-1515948725-edac7b5bb0fc", "https://images.unsplash.com/photo-1523376460408-aeb5f5d051b8", "https://plus.unsplash.com/premium_photo-1690482772122-b745b7a4343b", "https://images.unsplash.com/photo-1507494924047-60b8ee826ca9",
  "https://plus.unsplash.com/premium_photo-1670076513880-f58e3c377903", "https://images.unsplash.com/photo-1631679706909-1844bbd07221", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc", "https://plus.unsplash.com/premium_photo-1678074057896-eee996d4a23e", "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92", "https://images.unsplash.com/photo-1567016432779-094069958ea5",
  "https://plus.unsplash.com/premium_photo-1683880731792-39c07ceea617", "https://images.unsplash.com/photo-1549637642-90187f64f420", "https://images.unsplash.com/photo-1497215728101-856f4ea42174", "https://images.unsplash.com/photo-1497366754035-f200968a6e72", "https://plus.unsplash.com/premium_photo-1681487178876-a1156952ec60", "https://images.unsplash.com/photo-1606857521015-7f9fcf423740",
  "https://plus.unsplash.com/premium_photo-1681276170683-706111cf496e", "https://images.unsplash.com/photo-1542291026-7eec264c27ff", "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93", "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d", "https://plus.unsplash.com/premium_photo-1709033404514-c3953af680b4", "https://images.unsplash.com/photo-1723802205505-2f88b2227718",
] as const;
const imageFor = (index: number) => `${DEMO_IMAGE_SOURCES[index]}?auto=format&fit=crop&w=1200&q=80`;

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

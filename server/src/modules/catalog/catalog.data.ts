import type { Product } from "./catalog.types.js";

export const PRODUCTS: Product[] = [
  { id: "p-aurora", slug: "aurora-wireless-headphones", name: "Aurora Wireless Headphones", category: "Audio", price: 129, originalPrice: 159, rating: 4.9, reviews: 284, image: "🎧", badge: "Best seller", description: "Immersive sound, cloud-soft cushions, and 40-hour battery life.", colors: ["Obsidian", "Pearl"], inStock: true },
  { id: "p-lumen", slug: "lumen-desk-lamp", name: "Lumen Desk Lamp", category: "Home", price: 79, rating: 4.8, reviews: 91, image: "💡", badge: "New", description: "A sculptural, dimmable lamp designed for focused work and calm evenings.", colors: ["Sand", "Graphite"], inStock: true },
  { id: "p-canvas", slug: "canvas-weekender", name: "Canvas Weekender", category: "Bags", price: 118, rating: 4.7, reviews: 142, image: "👜", description: "A refined carry-all with a padded laptop sleeve and thoughtful compartments.", colors: ["Olive", "Cocoa"], inStock: true },
  { id: "p-kinetic", slug: "kinetic-watch", name: "Kinetic Watch", category: "Accessories", price: 189, originalPrice: 220, rating: 4.9, reviews: 64, image: "⌚", badge: "Limited", description: "Minimal stainless steel design with an automatic movement.", colors: ["Steel", "Black"], inStock: true },
  { id: "p-arc", slug: "arc-mechanical-keyboard", name: "Arc Mechanical Keyboard", category: "Tech", price: 139, rating: 4.8, reviews: 205, image: "⌨️", description: "Precision-tuned keys with a compact, premium aluminum frame.", colors: ["Silver", "Midnight"], inStock: true },
  { id: "p-solace", slug: "solace-throw", name: "Solace Throw", category: "Home", price: 58, rating: 4.6, reviews: 73, image: "🧶", description: "A weighty, breathable textured throw for slow weekends.", colors: ["Clay", "Cloud"], inStock: true },
];

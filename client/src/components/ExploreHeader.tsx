"use client";

import { Menu, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { headerWishlistPath } from "@/features/catalog/header-wishlist";
import { useCart } from "@/hooks/useCart";
import { BrandLogo } from "@/components/BrandLogo";

type ExploreDestination = "shop" | "deals" | "stores";

const destinations: { id: ExploreDestination; href: string; label: string }[] = [
  { id: "shop", href: "/", label: "Shop" },
  { id: "deals", href: "/deals", label: "Active deals" },
  { id: "stores", href: "/stores", label: "Stores" },
];

export function ExploreHeader({ active }: { active: ExploreDestination }) {
  const cart = useCart();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  const closeMobileNavigation = () => {
    setMobileNavOpen(false);
    requestAnimationFrame(() => mobileToggleRef.current?.focus());
  };
  const searchCatalog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      return;
    }
    router.push("/#collection");
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && mobileNavOpen) closeMobileNavigation();
  };

  return <header className="marketplace-header explore-header" onKeyDown={handleKeyDown}>
    <div className="marketplace-utility"><div className="shell"><span>Explore products from independent stores.</span><div><Link href="/stores">Discover stores</Link><Link href="/register/seller">Sell with NexaMart</Link></div></div></div>
    <div className="shell marketplace-topbar">
      <Link className="marketplace-brand" href="/" aria-label="NexaMart marketplace"><BrandLogo monogram className="marketplace-brand-mark" priority /><span>NexaMart</span></Link>
      <form className="marketplace-search" role="search" onSubmit={searchCatalog}><Search size={17} aria-hidden="true"/><label className="sr-only" htmlFor="explore-search">Search the marketplace</label><input id="explore-search" aria-label="Search the marketplace" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products, brands, and departments" /><button className="marketplace-search-submit" type="submit" aria-label="Search the marketplace"><Search size={17} aria-hidden="true"/></button></form>
      <div className="marketplace-actions"><Link className="marketplace-account" href="/stores">Stores</Link><Link className="marketplace-account" href="/deals">Deals</Link><Link className="marketplace-account" href={headerWishlistPath(cart.authenticated)}>Wishlist</Link><Link className="marketplace-account" href="/account">Account</Link><button ref={mobileToggleRef} className="icon-button mobile-menu-toggle" type="button" aria-label="Toggle explore navigation" aria-expanded={mobileNavOpen} aria-controls="explore-navigation" onClick={() => mobileNavOpen ? closeMobileNavigation() : setMobileNavOpen(true)}><Menu size={18} aria-hidden="true"/></button><Link className="marketplace-bag" href="/?bag=1" aria-label="Open shopping bag"><ShoppingBag size={18} aria-hidden="true"/><span>Bag{cart.totalItems ? ` ${cart.totalItems}` : ""}</span></Link></div>
    </div>
    <nav id="explore-navigation" className={`marketplace-category-nav ${mobileNavOpen ? "is-open" : ""}`} aria-label="Explore navigation"><div className="shell marketplace-rail">{destinations.map((destination) => <Link key={destination.id} href={destination.href} aria-current={destination.id === active ? "page" : undefined} onClick={() => setMobileNavOpen(false)}>{destination.label}</Link>)}<Link className="mobile-marketplace-account" href={headerWishlistPath(cart.authenticated)} onClick={() => setMobileNavOpen(false)}>Wishlist</Link><Link className="mobile-marketplace-account" href="/account" onClick={() => setMobileNavOpen(false)}>Account</Link></div></nav>
  </header>;
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { postJSON } from "@/lib/api";
import type { Account } from "@/types/account";
import { authFieldId, createAuthFormState, setAuthFormField, type AuthFormField } from "./roleAuthForm";
import styles from "./RoleAuth.module.css";

export type AuthRouteRole = "customer" | "seller" | "admin";
type AuthMode = "login" | "register";
type RoleAuthProps = { mode: AuthMode; role: AuthRouteRole };
type RoleCapability = { label: string; detail: string };
type RoleContext = { label: string; heading: string; emphasizedHeading: string; panelDetail: string; tagline: string; formCopy: string; image: string; imageAlt: string; capabilities: RoleCapability[] };

const sharedAuthReference = {
  wordmark: "NexaMart",
  tagline: "Better Products. Happier You.",
  closingLine: "Your Next Favorite Is Just a Click Away",
};

const roleDestinations: Record<AuthRouteRole, string> = {
  customer: "/account",
  seller: "/seller",
  admin: "/admin",
};

const roleNames: Record<AuthRouteRole, string> = {
  customer: "customer",
  seller: "seller",
  admin: "administrator",
};

const roleTabs: Array<{ role: AuthRouteRole; label: string; detail: string }> = [
  { role: "customer", label: "Customer", detail: "Shop & orders" },
  { role: "seller", label: "Seller", detail: "Apply & manage" },
  { role: "admin", label: "Admin", detail: "Provisioned only" },
];

const roleContexts: Record<AuthRouteRole, RoleContext> = {
  customer: { label: "Customer account", heading: "Find what", emphasizedHeading: "fits today.", panelDetail: "Browse the catalog, save favorites, and revisit your account orders.", tagline: "Make room for the good stuff.", formCopy: "Use your NexaMart account to keep orders and favorites together.", image: "/auth/customer-panel.png", imageAlt: "Illustrative customer shopping objects", capabilities: [{ label: "Browse products", detail: "Explore the current catalog" }, { label: "Save favorites", detail: "Keep items close" }, { label: "Account orders", detail: "See your order history" }] },
  seller: { label: "Seller application", heading: "Build your", emphasizedHeading: "store story.", panelDetail: "Create your account, submit store details, and manage your store after approval.", tagline: "Start with what you make.", formCopy: "Sign in to manage an approved store, or apply with your customer account.", image: "/auth/seller-panel.png", imageAlt: "Illustrative seller packing and product desk", capabilities: [{ label: "Store details", detail: "Tell your store story" }, { label: "Submit application", detail: "Send details for review" }, { label: "Approved store tools", detail: "Manage your active store" }] },
  admin: { label: "Administrator access", heading: "Guide the", emphasizedHeading: "workspace.", panelDetail: "Sign in with a locally provisioned account for your assigned governance workspace.", tagline: "Keep the work in view.", formCopy: "Use the administrator account provisioned for your local NexaMart team.", image: "/auth/admin-panel.png", imageAlt: "Illustrative administrator governance desk", capabilities: [{ label: "Local provisioning", detail: "Accounts are created locally" }, { label: "Administrator sign-in", detail: "Use your provisioned account" }, { label: "Governance workspace", detail: "Work within assigned access" }] },
};

function roleRoute(mode: AuthMode, role: AuthRouteRole): string {
  const prefix = mode === "login" ? "/login" : "/register";
  return role === "customer" ? prefix : `${prefix}/${role}`;
}

function RoleTabs({ mode, role }: Pick<RoleAuthProps, "mode" | "role">) {
  return <nav className="role-auth-tabs" aria-label="Choose account role">
    {roleTabs.map((tab) => <Link key={tab.role} href={roleRoute(mode, tab.role)} aria-current={tab.role === role ? "page" : undefined}><span>{tab.label}</span><small>{tab.detail}</small></Link>)}
  </nav>;
}

function AuthContext({ role }: Pick<RoleAuthProps, "role">) {
  const context = roleContexts[role];

  return <aside className="role-auth-context" aria-label={`${context.label} context`}>
    <div className="role-auth-media">
      <Image className={`role-auth-photo role-auth-photo--${role}`} src={context.image} alt={context.imageAlt} fill sizes="(max-width: 760px) 100vw, 42vw" />
      <span className="role-auth-photo-overlay" aria-hidden="true" />
    </div>
    <div className="role-auth-context-content">
      <Link className="role-auth-wordmark" href="/" aria-label="NexaMart home">
        <BrandLogo monogram className="role-auth-monogram" priority />
      </Link>
      <div className="role-auth-editorial">
        <div className="role-auth-context-copy">
        <p className="role-auth-kicker">NexaMart</p>
        <p className="role-auth-context-role">{context.label}</p>
        <h2>{context.heading}<br /><em>{context.emphasizedHeading}</em></h2>
        <p className="role-auth-panel-detail">{context.panelDetail}</p>
        </div>
        <ul className="role-auth-capabilities">
          {context.capabilities.map((capability) => <li key={capability.label}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.2 16.5 19 6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span><strong>{capability.label}</strong><small>{capability.detail}</small></span>
          </li>)}
        </ul>
      </div>
      <p className="role-auth-vertical-tagline" aria-hidden="true">{sharedAuthReference.closingLine}</p>
    </div>
  </aside>;
}

export function RoleAuth({ mode, role }: RoleAuthProps) {
  const router = useRouter();
  const context = roleContexts[role];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [wrongRole, setWrongRole] = useState<AuthRouteRole | null>(null);
  const [success, setSuccess] = useState("");
  const [formState, setFormState] = useState(createAuthFormState);
  const isAdminRegistration = mode === "register" && role === "admin";
  const isSellerRegistration = mode === "register" && role === "seller";
  const formIntro = isSellerRegistration ? "Create your account, then submit store details for review." : context.formCopy;
  const title = mode === "login" ? `Sign in as ${roleNames[role]}.` : role === "seller" ? "Submit a seller application." : "Create your account.";

  const updateFormField = (field: AuthFormField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState((current) => setAuthFormField(current, field, event.currentTarget.value));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setWrongRole(null);
    setSuccess("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");
    const storeName = String(form.get("storeName") ?? "");
    const storeSlug = String(form.get("storeSlug") ?? "");
    const description = String(form.get("description") ?? "");

    try {
      if (mode === "login") {
        const { account } = await postJSON<{ account: Account }>("/auth/login", { email, password });
        const destination = roleDestinations[account.role];
        if (account.role !== role) {
          setError(`This account is a ${roleNames[account.role]} account. Use the ${roleNames[account.role]} sign-in route instead.`);
          setWrongRole(account.role);
          return;
        }
        router.replace(destination);
        return;
      }

      const { account } = await postJSON<{ account: Account }>("/auth/register", { name, email, password });
      if (isSellerRegistration) {
        const sellerApplication = { storeName, storeSlug, ...(description.trim() ? { description } : {}) };
        try {
          await postJSON("/seller/application", sellerApplication);
        } catch {
          setError("Your customer account was created, but your seller application could not be submitted. Sign in as a customer and retry your seller application or contact support. You do not have seller access.");
          return;
        }
        event.currentTarget.reset();
        setFormState(createAuthFormState());
        setSuccess("Seller application submitted. Seller access starts only after an administrator approves your application.");
        return;
      }
      router.replace(roleDestinations[account.role]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (isAdminRegistration) return <div className={styles.shell}><main className="role-auth-shell" data-role={role}>
    <div className="role-auth-layout">
      <AuthContext role={role} />
      <section className="role-auth-panel" aria-labelledby="admin-provisioning-heading">
        <div className="role-auth-panel-content">
          <Link className="role-auth-mobile-brand" href="/" aria-label="NexaMart home"><BrandLogo monogram className="role-auth-monogram" priority /></Link>
          <RoleTabs mode={mode} role={role} />
          <p className="eyebrow">Admin access</p>
          <h1 id="admin-provisioning-heading">Admin accounts are not self-registered.</h1>
          <p className="role-auth-intro">Ask a local NexaMart administrator to provision an admin account for you.</p>
          <p className="role-auth-note">After it is provisioned, use the administrator sign-in route.</p>
          <div className="role-auth-actions"><Link className="primary-button" href="/login/admin">Administrator sign in</Link><Link className="role-auth-link" href="/">Return to storefront</Link></div>
        </div>
      </section>
    </div>
  </main></div>;

  return <div className={styles.shell}><main className="role-auth-shell" data-role={role}>
    <div className="role-auth-layout">
      <AuthContext role={role} />
      <section className="role-auth-panel" aria-labelledby="role-auth-heading">
        <div className="role-auth-panel-content">
          <Link className="role-auth-mobile-brand" href="/" aria-label="NexaMart home"><BrandLogo monogram className="role-auth-monogram" priority /></Link>
          <RoleTabs mode={mode} role={role} />
          <p className="eyebrow">{roleNames[role]} {mode}</p>
          <h1 id="role-auth-heading">{title}</h1>
          <p className="role-auth-intro">{formIntro}</p>
          <form onSubmit={submit} aria-busy={saving}>
            {mode === "register" && <label htmlFor={authFieldId(mode, role, "name")}>Name<input id={authFieldId(mode, role, "name")} required name="name" value={formState.name} onChange={updateFormField("name")} minLength={2} autoComplete="name" disabled={saving} /></label>}
            <div className="role-auth-credentials"><label htmlFor={authFieldId(mode, role, "email")}>Email<input id={authFieldId(mode, role, "email")} required name="email" value={formState.email} onChange={updateFormField("email")} type="email" autoComplete="email" disabled={saving} /></label>
            <label htmlFor={authFieldId(mode, role, "password")}>Password<input id={authFieldId(mode, role, "password")} required name="password" value={formState.password} onChange={updateFormField("password")} type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} disabled={saving} /></label></div>
            {isSellerRegistration && <fieldset className="role-auth-store-fields"><legend>Store application</legend><label htmlFor={authFieldId(mode, role, "storeName")}>Store name<input id={authFieldId(mode, role, "storeName")} required name="storeName" value={formState.storeName} onChange={updateFormField("storeName")} minLength={2} maxLength={120} autoComplete="organization" disabled={saving} /></label><label htmlFor={authFieldId(mode, role, "storeSlug")}>Store URL slug<input id={authFieldId(mode, role, "storeSlug")} required name="storeSlug" value={formState.storeSlug} onChange={updateFormField("storeSlug")} minLength={2} maxLength={100} autoComplete="off" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" aria-describedby="store-slug-help" disabled={saving} /></label><small id="store-slug-help">Use lowercase letters, numbers, and hyphens only.</small><label htmlFor={authFieldId(mode, role, "description")}>Store description (optional)<textarea id={authFieldId(mode, role, "description")} name="description" value={formState.description} onChange={updateFormField("description")} minLength={10} maxLength={2000} rows={4} autoComplete="off" disabled={saving} /></label></fieldset>}
            {saving && <p className="role-auth-pending" role="status" aria-live="polite">Submitting your details…</p>}
            {error && <p className="seller-error" role="alert">{error}</p>}
            {wrongRole && <Link className="role-auth-recovery-link" href={roleRoute("login", wrongRole)}>Continue to {roleNames[wrongRole]} sign in</Link>}
            {success && <p className="seller-profile-success" role="status">{success}</p>}
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Submitting…" : mode === "login" ? `Sign in as ${roleNames[role]}` : isSellerRegistration ? "Submit seller application" : "Create customer account"}</button>
          </form>
          <nav className="role-auth-links" aria-label="Account routes"><Link href={roleRoute(mode === "login" ? "register" : "login", role)}>{mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}</Link>{role !== "customer" && <Link href={roleRoute(mode, "customer")}>Customer {mode}</Link>}</nav>
        </div>
      </section>
    </div>
  </main></div>;
}

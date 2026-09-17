import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productForm = readFileSync(new URL("../src/features/seller/SellerProductForm.tsx", import.meta.url), "utf8");
const promotionForm = readFileSync(new URL("../src/features/seller/SellerPromotionForm.tsx", import.meta.url), "utf8");
const assets = readFileSync(new URL("../src/features/seller/SellerProductAssets.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");

test("async create forms announce their own successful reconciliation politely without moving focus", () => {
  assert.match(productForm, /const \[success, setSuccess\] = useState\(""\);/);
  assert.match(productForm, /onCreated\(\{ \.\.\.product, isPublished: false \}\);\s*event\.currentTarget\.reset\(\);\s*setSuccess\("Product draft created\."\);/);
  assert.match(productForm, /<p className="seller-profile-success" role="status">\{success\}<\/p>/);

  assert.match(promotionForm, /const \[success, setSuccess\] = useState\(""\);/);
  assert.match(promotionForm, /onCreated\(promotion\);\s*event\.currentTarget\.reset\(\);\s*setSuccess\("Product flash offer created\."\);/);
  assert.match(promotionForm, /<p className="seller-profile-success" role="status">\{success\}<\/p>/);

  assert.match(taxonomy, /const \[feedback, setFeedback\] = useState<Record<string, Feedback>>\(\{\}\);/);
  assert.match(taxonomy, /form\.reset\(\);\s*setFeedback\(\(current\) => \(\{ \.\.\.current, \[id\]: \{ kind: "success"/);
  assert.match(taxonomy, /<p role=\{itemFeedback\.kind === "error" \? "alert" : "status"\}>\{itemFeedback\.message\}<\/p>/);

  assert.match(workspace, /const \[addressCreateSuccess, setAddressCreateSuccess\] = useState\(""\);/);
  assert.match(workspace, /event\.currentTarget\.reset\(\); await loadAddresses\(\);\s*setAddressCreateSuccess\("Shipping address saved\."\);/);
  assert.match(workspace, /<p className="seller-profile-success" role="status">\{addressCreateSuccess\}<\/p>/);

  assert.match(productForm, /inputRef\.current\?\.focus\(\)/);
  assert.match(promotionForm, /inputRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(`${assets}\n${taxonomy}\n${workspace}`, /\.focus\(|autoFocus/);
});

test("asset-create confirmations stay scoped to variants and gallery images", () => {
  assert.match(assets, /const \[variantSuccess, setVariantSuccess\] = useState\(""\);/);
  assert.match(assets, /const \[imageSuccess, setImageSuccess\] = useState\(""\);/);
  assert.match(assets, /setVariants\(\(items\) => \[\.\.\.items, response\.variant\]\);\s*event\.currentTarget\.reset\(\);\s*setVariantSuccess\("Variant added\."\);/);
  assert.match(assets, /setImages\(\(items\) => \[\.\.\.items, response\.image\]\.sort\(\(left, right\) => left\.sortOrder - right\.sortOrder\)\);\s*event\.currentTarget\.reset\(\);\s*setImageSuccess\("Gallery image added\."\);/);
  assert.match(assets, /<form className="seller-asset-form" onSubmit=\{addVariant\}>[\s\S]*?\{variantSuccess && <p className="seller-profile-success" role="status">\{variantSuccess\}<\/p>\}/);
  assert.match(assets, /<form className="seller-asset-form" onSubmit=\{addImage\}>[\s\S]*?\{imageSuccess && <p className="seller-profile-success" role="status">\{imageSuccess\}<\/p>\}/);
});

test("create retries and errors clear stale confirmations before a new result", () => {
  for (const source of [productForm, promotionForm, assets, workspace]) {
    assert.match(source, /set(?:Success|CreateSuccess|AddressCreateSuccess|VariantSuccess|ImageSuccess)\(""\)/);
  }
  assert.match(productForm, /setError\(""\); setSuccess\(""\); setSaving\(true\);/);
  assert.match(promotionForm, /setError\(""\);\s*setSuccess\(""\);/);
  assert.match(assets, /setSavingVariant\(true\);\s*setError\(""\);\s*setVariantSuccess\(""\);/);
  assert.match(assets, /setSavingImage\(true\);\s*setError\(""\);\s*setImageSuccess\(""\);/);
  assert.match(taxonomy, /if \(!beginMutation\(id\)\) return;/);
  assert.match(workspace, /event\.preventDefault\(\); setError\(""\); setAddressCreateSuccess\(""\); setSaving\(true\);/);
});

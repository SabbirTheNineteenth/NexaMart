CREATE UNIQUE INDEX "seller_profiles_store_name_unique" ON "seller_profiles" USING btree (lower("store_name"));

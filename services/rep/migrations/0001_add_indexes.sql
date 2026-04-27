CREATE INDEX "contacts_created_at_desc_idx" ON "contacts" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contacts_advisor_id_idx" ON "contacts" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "contacts_full_name_lower_idx" ON "contacts" USING btree (lower("last_name" || ' ' || "first_name"));--> statement-breakpoint
CREATE INDEX "contacts_email_lower_idx" ON "contacts" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "contacts_intake_status_idx" ON "contacts" USING btree ("intake_status");--> statement-breakpoint
CREATE INDEX "contacts_referral_status_idx" ON "contacts" USING btree ("referral_status");
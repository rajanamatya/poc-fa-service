CREATE TABLE "contacts" (
	"client_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"state" text NOT NULL,
	"notes" text,
	"intake_status" text DEFAULT 'not_started' NOT NULL,
	"referral_status" text DEFAULT 'none' NOT NULL,
	"consent_status" text DEFAULT 'pending' NOT NULL,
	"consent_given_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_intake_status_check" CHECK ("contacts"."intake_status" IN ('not_started', 'in_progress', 'complete')),
	CONSTRAINT "contacts_referral_status_check" CHECK ("contacts"."referral_status" IN ('none', 'referred', 'viewed', 'connected')),
	CONSTRAINT "contacts_consent_status_check" CHECK ("contacts"."consent_status" IN ('pending', 'accepted', 'declined'))
);

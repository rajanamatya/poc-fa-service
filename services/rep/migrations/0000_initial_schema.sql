CREATE TYPE "public"."consent_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."intake_status" AS ENUM('not_started', 'in_progress', 'complete');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('none', 'referred', 'viewed', 'connected');--> statement-breakpoint
CREATE TABLE "contacts" (
	"client_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"state" text NOT NULL,
	"notes" text,
	"intake_status" "intake_status" DEFAULT 'not_started' NOT NULL,
	"referral_status" "referral_status" DEFAULT 'none' NOT NULL,
	"consent_status" "consent_status" DEFAULT 'pending' NOT NULL,
	"consent_given_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

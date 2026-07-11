ALTER TABLE "journal_template_items" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "journal_template_items" ADD COLUMN "requires_photo" boolean DEFAULT false NOT NULL;
ALTER TABLE "students" ADD COLUMN "status" varchar(10) DEFAULT 'aktif' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "graduated_at" timestamp with time zone;
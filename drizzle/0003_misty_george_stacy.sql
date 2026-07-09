CREATE TABLE "evidence_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"requirement_date" date NOT NULL,
	"template_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_requirements" ADD CONSTRAINT "evidence_requirements_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requirements" ADD CONSTRAINT "evidence_requirements_template_item_id_journal_template_items_id_fk" FOREIGN KEY ("template_item_id") REFERENCES "public"."journal_template_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_requirements_teacher_date_idx" ON "evidence_requirements" USING btree ("teacher_id","requirement_date");
ALTER TABLE `cards` ADD `concept_id` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `rung` integer;--> statement-breakpoint
ALTER TABLE `cards` ADD `source_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `cards_source_key_unique` ON `cards` (`source_key`);--> statement-breakpoint
CREATE INDEX `cards_concept_idx` ON `cards` (`concept_id`);
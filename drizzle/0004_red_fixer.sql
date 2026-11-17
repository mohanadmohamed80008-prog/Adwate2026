CREATE TABLE `siteStats` (
	`id` int NOT NULL,
	`visitsTotal` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteStats_id` PRIMARY KEY(`id`)
);

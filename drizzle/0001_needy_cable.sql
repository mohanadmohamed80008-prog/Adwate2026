CREATE TABLE `siteSettings` (
	`id` int NOT NULL,
	`maintenanceEnabled` int NOT NULL DEFAULT 0,
	`scheduledEnabled` int NOT NULL DEFAULT 1,
	`maintenanceFrom` varchar(5) NOT NULL DEFAULT '02:00',
	`maintenanceTo` varchar(5) NOT NULL DEFAULT '04:00',
	`allowRegistration` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`)
);

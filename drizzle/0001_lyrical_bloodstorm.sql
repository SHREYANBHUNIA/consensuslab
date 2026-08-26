CREATE TABLE `simulationRuns` (
	`id` varchar(48) NOT NULL,
	`ownerOpenId` varchar(64),
	`scenarioName` varchar(120) NOT NULL,
	`summary` json NOT NULL,
	`status` enum('completed','interrupted','reset') NOT NULL DEFAULT 'completed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulationRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulationScenarios` (
	`id` varchar(48) NOT NULL,
	`ownerOpenId` varchar(64),
	`name` varchar(120) NOT NULL,
	`configuration` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simulationScenarios_id` PRIMARY KEY(`id`)
);

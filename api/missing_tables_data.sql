CREATE TABLE `machining_operations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupName` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `hrRate` decimal(10,2) DEFAULT '0.00',
  `setTimeRate` decimal(10,2) DEFAULT '0.00',
  `machineId` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=latin1;

INSERT INTO `machining_operations` (`id`, `groupName`, `name`, `hrRate`, `setTimeRate`, `machineId`) VALUES
  (1, 'General', 'Parting', '500.00', '500.00', NULL),
  (2, 'Milling', 'Manual Milling', '2500.00', '2500.00', NULL),
  (3, 'Milling', 'Gear Hobbing', '2500.00', '2500.00', NULL),
  (4, 'Man Lathe', 'Normal', '2500.00', '2500.00', NULL),
  (5, 'Man Lathe', 'Blue 800x3000', '3000.00', '3000.00', NULL),
  (6, 'Man Lathe', 'Japan Heavy', '4000.00', '4000.00', NULL),
  (7, 'Man Lathe', 'Coping Lathe', '5000.00', '5000.00', NULL),
  (8, 'Man Lathe', 'Shaping', '2500.00', '2500.00', NULL),
  (9, 'CNC Milling', '3 Axis', '4500.00', '4500.00', NULL),
  (10, 'CNC Milling', '4 Axis', '5000.00', '5000.00', NULL),
  (11, 'CNC Milling', '5 Axis', '7500.00', '7500.00', NULL),
  (12, 'CNC Milling', '3 Axis 1600 Bed', '7000.00', '7000.00', NULL),
  (13, 'CNC Lathe', 'Turning', '5500.00', '5500.00', NULL),
  (14, 'CNC Lathe', 'Turnmill', '6000.00', '6000.00', NULL),
  (15, 'CNC Lathe', 'WEDM', '2500.00', '2500.00', NULL),
  (16, 'CNC Lathe', 'EDM', '2500.00', '2500.00', NULL),
  (17, 'CNC Lathe', 'Hardening', '1500.00', '1500.00', NULL),
  (18, 'CNC Lathe', 'Surface Grinding', '1500.00', '1500.00', NULL),
  (19, 'CNC Lathe', 'Cylindricle grinding', '1500.00', '1500.00', NULL),
  (20, 'CNC Lathe', 'Knife Grinder', '2500.00', '2500.00', NULL),
  (21, 'Welding', 'Tig (SS/AL)', '1500.00', '1500.00', NULL),
  (22, 'Welding', 'Mig (SS/MS/UTP)', '1200.00', '1200.00', NULL),
  (23, 'Welding', 'Arc (SS/MS/UTP)', '1100.00', '1100.00', NULL),
  (24, 'Welding', 'Laser Welding', '2500.00', '2500.00', NULL),
  (25, 'Fabrication', 'Shearing (per cut)', '200.00', '200.00', NULL),
  (26, 'Fabrication', 'Bending (per bend)', '200.00', '200.00', NULL),
  (27, 'Fabrication', 'Hand work/handling', '500.00', '500.00', NULL);

CREATE TABLE `machine_categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `machine_categories` (`id`, `name`, `createdAt`) VALUES
  ('CAT-0u2vzc', 'Man Lathe', '2026-09-16 09:18:41.000'),
  ('CAT-6qqceh', 'CNC Lathe', '2026-09-16 09:18:41.000'),
  ('CAT-fb5v5g', 'Fabrication', '2026-09-16 09:18:41.000'),
  ('CAT-jri0aa', 'Milling', '2026-09-16 09:18:41.000'),
  ('CAT-lksc30', 'General', '2026-09-16 09:18:41.000'),
  ('CAT-rf59dz', 'Welding', '2026-09-16 09:18:41.000'),
  ('CAT-tpb9wz', 'CNC Milling', '2026-09-16 09:18:41.000');

CREATE TABLE `rework_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workOrderId` varchar(50) DEFAULT NULL,
  `operationId` int(11) DEFAULT NULL,
  `reason` text,
  `hours` decimal(10,2) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `suppliers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `contactPerson` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `taxId` varchar(100) DEFAULT NULL,
  `balance` decimal(15,2) DEFAULT '0.00',
  `createdAt` datetime DEFAULT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

REPLACE INTO `machineries` (`id`, `name`, `type`, `model`, `status`, `hourlyCost`, `lastMaintenance`, `createdAt`) VALUES
  ('MAC-001', 'Heavy Duty Lathe', 'Lathe', 'Mazak QTE-100', 'Active', '1500.00', '2026-08-10 00:00:00.000', NULL),
  ('MAC-002', 'CNC Milling Machine', 'Milling', 'Haas VF-2', 'Maintenance', '2500.00', '2026-09-01 00:00:00.000', NULL),
  ('MAC-003', 'Hydraulic Press', 'Press', 'Amada 100T', 'Active', '800.00', '2026-07-15 00:00:00.000', NULL);


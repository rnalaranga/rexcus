import db from './db';

const customers = [
  { id: 'CUST-001', name: 'Malith Senanayake', company: 'Lanka Steel Corp', email: 'malith@lankasteel.lk', phone: '+94 77 123 4567', status: 'vip', segment: 'enterprise', industry: 'Construction', lifetimeValue: 8500000, totalRevenue: 1250000, openDeals: 2, lastOrder: '2026-08-15T10:30:00Z', joinDate: '2024-03-12T00:00:00Z', accountManager: 'Dasun Perera', avatar: 'LS' },
  { id: 'CUST-002', name: 'Amandi Peiris', company: 'Ceylon Rubber Ind.', email: 'amandi.p@ceylonrubber.lk', phone: '+94 71 234 5678', status: 'active', segment: 'sme', industry: 'Manufacturing', lifetimeValue: 2400000, totalRevenue: 450000, openDeals: 1, lastOrder: '2026-08-20T14:15:00Z', joinDate: '2025-01-18T00:00:00Z', accountManager: 'Nishantha Silva', avatar: 'CR' },
  { id: 'CUST-003', name: 'Ruwan Kumara', company: 'GreenPower Energy', email: 'ruwan@greenpower.lk', phone: '+94 77 345 6789', status: 'active', segment: 'enterprise', industry: 'Energy', lifetimeValue: 12000000, totalRevenue: 3400000, openDeals: 3, lastOrder: '2026-08-28T09:45:00Z', joinDate: '2023-11-05T00:00:00Z', accountManager: 'Dasun Perera', avatar: 'GP' },
  { id: 'CUST-004', name: 'Piumi Fernando', company: 'BioMed Lanka', email: 'piumi.f@biomed.lk', phone: '+94 70 456 7890', status: 'inactive', segment: 'sme', industry: 'Healthcare', lifetimeValue: 850000, totalRevenue: 0, openDeals: 0, lastOrder: '2025-12-10T11:20:00Z', joinDate: '2025-06-22T00:00:00Z', accountManager: 'Kavindi de Silva', avatar: 'BM' },
  { id: 'CUST-005', name: 'Saman Weerasinghe', company: 'AutoParts LK', email: 'saman.w@autoparts.lk', phone: '+94 77 567 8901', status: 'prospect', segment: 'retail', industry: 'Automotive', lifetimeValue: 0, totalRevenue: 0, openDeals: 1, lastOrder: '2026-01-01T00:00:00Z', joinDate: '2026-08-01T00:00:00Z', accountManager: 'Nishantha Silva', avatar: 'AP' },
  { id: 'CUST-006', name: 'Charith Jayasuriya', company: 'AquaTech Solutions', email: 'charith@aquatech.lk', phone: '+94 71 678 9012', status: 'active', segment: 'sme', industry: 'Engineering', lifetimeValue: 3100000, totalRevenue: 890000, openDeals: 1, lastOrder: '2026-08-25T16:00:00Z', joinDate: '2024-09-14T00:00:00Z', accountManager: 'Dasun Perera', avatar: 'AT' },
  { id: 'CUST-007', name: 'Dilini Perera', company: 'TasteCeylon Exports', email: 'dilini@tasteceylon.lk', phone: '+94 77 789 0123', status: 'vip', segment: 'enterprise', industry: 'Food & Beverage', lifetimeValue: 18500000, totalRevenue: 5200000, openDeals: 2, lastOrder: '2026-08-30T10:15:00Z', joinDate: '2022-04-10T00:00:00Z', accountManager: 'Kavindi de Silva', avatar: 'TC' },
  { id: 'CUST-008', name: 'Isuru Bandara', company: 'BuildFast Materials', email: 'isuru.b@buildfast.lk', phone: '+94 70 890 1234', status: 'active', segment: 'sme', industry: 'Construction', lifetimeValue: 4200000, totalRevenue: 1100000, openDeals: 0, lastOrder: '2026-07-15T13:45:00Z', joinDate: '2024-11-28T00:00:00Z', accountManager: 'Nishantha Silva', avatar: 'BF' },
  { id: 'CUST-009', name: 'Nayomi Ranasinghe', company: 'SmartHome Tech', email: 'nayomi@smarthome.lk', phone: '+94 77 901 2345', status: 'prospect', segment: 'retail', industry: 'Electronics', lifetimeValue: 0, totalRevenue: 0, openDeals: 1, lastOrder: '2026-01-01T00:00:00Z', joinDate: '2026-08-20T00:00:00Z', accountManager: 'Kavindi de Silva', avatar: 'SH' },
  { id: 'CUST-010', name: 'Thilina Rajapakse', company: 'AgriLanka Holdings', email: 'thilina@agrilanka.lk', phone: '+94 71 012 3456', status: 'active', segment: 'enterprise', industry: 'Agriculture', lifetimeValue: 9800000, totalRevenue: 2100000, openDeals: 1, lastOrder: '2026-08-10T09:30:00Z', joinDate: '2023-08-05T00:00:00Z', accountManager: 'Dasun Perera', avatar: 'AL' }
];

const leads = [
  { id: 'LEAD-001', name: 'Kasun Herath', company: 'TechNova', email: 'kasun@technova.lk', phone: '+94 77 111 2222', stage: 'negotiation', priority: 'high', source: 'website', value: 1200000, probability: 75, assignedTo: 'Dasun Perera', lastActivity: '2026-09-01T10:30:00Z' },
  { id: 'LEAD-002', name: 'Nimesh Silva', company: 'Lanka Logistics', email: 'nimesh@ll.lk', phone: '+94 71 222 3333', stage: 'new', priority: 'medium', source: 'referral', value: 850000, probability: 20, assignedTo: 'Kavindi de Silva', lastActivity: '2026-09-02T08:15:00Z' },
  { id: 'LEAD-003', name: 'Piyumi Fernando', company: 'AquaFresh LK', email: 'piyumi@aquafresh.lk', phone: '+94 70 333 4444', stage: 'qualified', priority: 'high', source: 'exhibition', value: 3400000, probability: 50, assignedTo: 'Nishantha Silva', lastActivity: '2026-08-30T14:45:00Z' },
  { id: 'LEAD-004', name: 'Ravi Jayaratne', company: 'BuildCorp', email: 'ravi@buildcorp.lk', phone: '+94 77 444 5555', stage: 'proposal', priority: 'critical', source: 'direct_call', value: 5500000, probability: 60, assignedTo: 'Dasun Perera', lastActivity: '2026-09-01T16:20:00Z' },
  { id: 'LEAD-005', name: 'Sanduni Perera', company: 'Ceylon Teas', email: 'sanduni@ceylonteas.lk', phone: '+94 71 555 6666', stage: 'contacted', priority: 'low', source: 'email_campaign', value: 450000, probability: 30, assignedTo: 'Kavindi de Silva', lastActivity: '2026-08-28T09:10:00Z' },
  { id: 'LEAD-006', name: 'Tharindu Bandara', company: 'MegaMart', email: 'tharindu@megamart.lk', phone: '+94 77 666 7777', stage: 'won', priority: 'high', source: 'website', value: 2100000, probability: 100, assignedTo: 'Nishantha Silva', lastActivity: '2026-08-25T11:00:00Z' },
  { id: 'LEAD-007', name: 'Vindya Gunasekara', company: 'Nova Pharma', email: 'vindya@novapharma.lk', phone: '+94 70 777 8888', stage: 'lost', priority: 'medium', source: 'partner', value: 1800000, probability: 0, assignedTo: 'Dasun Perera', lastActivity: '2026-08-20T13:30:00Z' },
  { id: 'LEAD-008', name: 'Chamara Fonseka', company: 'PrintSolutions', email: 'chamara@printsol.lk', phone: '+94 77 888 9999', stage: 'new', priority: 'medium', source: 'website', value: 650000, probability: 10, assignedTo: 'Kavindi de Silva', lastActivity: '2026-09-02T09:00:00Z' },
  { id: 'LEAD-009', name: 'Dinithi Ranasinghe', company: 'EventLanka', email: 'dinithi@eventlanka.lk', phone: '+94 71 999 0000', stage: 'qualified', priority: 'low', source: 'social_media', value: 300000, probability: 40, assignedTo: 'Nishantha Silva', lastActivity: '2026-08-31T15:15:00Z' },
  { id: 'LEAD-010', name: 'Gayan Weerakoon', company: 'AutoMech', email: 'gayan@automech.lk', phone: '+94 77 000 1111', stage: 'proposal', priority: 'medium', source: 'referral', value: 1500000, probability: 55, assignedTo: 'Dasun Perera', lastActivity: '2026-09-01T14:00:00Z' }
];

const deals = [
  { id: 'DEAL-001', title: 'Q3 Material Restock', customerId: 'CUST-001', customerName: 'Malith Senanayake', company: 'Lanka Steel Corp', value: 2500000, stage: 'negotiation', probability: 75, priority: 'high', expectedClose: '2026-09-15T00:00:00Z', owner: 'Dasun Perera', product: 'Industrial Raw Materials', lastUpdated: '2026-09-01T10:30:00Z' },
  { id: 'DEAL-002', title: 'Annual Maintenance Contract', customerId: 'CUST-003', customerName: 'Ruwan Kumara', company: 'GreenPower Energy', value: 1200000, stage: 'proposal', probability: 55, priority: 'medium', expectedClose: '2026-09-20T00:00:00Z', owner: 'Dasun Perera', product: 'Service SLA', lastUpdated: '2026-09-02T08:15:00Z' },
  { id: 'DEAL-003', title: 'New Warehouse Setup', customerId: 'CUST-007', customerName: 'Dilini Perera', company: 'TasteCeylon Exports', value: 4800000, stage: 'open', probability: 40, priority: 'critical', expectedClose: '2026-10-10T00:00:00Z', owner: 'Kavindi de Silva', product: 'Heavy Machinery', lastUpdated: '2026-08-28T14:45:00Z' },
  { id: 'DEAL-004', title: 'Fleet Upgrade', customerId: 'CUST-005', customerName: 'Saman Weerasinghe', company: 'AutoParts LK', value: 3500000, stage: 'prospecting', probability: 25, priority: 'high', expectedClose: '2026-11-05T00:00:00Z', owner: 'Nishantha Silva', product: 'Commercial Vehicles', lastUpdated: '2026-09-01T16:20:00Z' },
  { id: 'DEAL-005', title: 'Software License Renewal', customerId: 'CUST-002', customerName: 'Amandi Peiris', company: 'Ceylon Rubber Ind.', value: 450000, stage: 'contract', probability: 90, priority: 'low', expectedClose: '2026-09-05T00:00:00Z', owner: 'Nishantha Silva', product: 'Enterprise Software', lastUpdated: '2026-08-30T09:10:00Z' },
  { id: 'DEAL-006', title: 'Q4 Bulk Supply', customerId: 'CUST-010', customerName: 'Thilina Rajapakse', company: 'AgriLanka Holdings', value: 6200000, stage: 'closed_won', probability: 100, priority: 'high', expectedClose: '2026-08-10T00:00:00Z', owner: 'Dasun Perera', product: 'Agricultural Supplies', lastUpdated: '2026-08-10T11:00:00Z' },
  { id: 'DEAL-007', title: 'Lab Equipment Purchase', customerId: 'LEAD-007', customerName: 'Vindya Gunasekara', company: 'Nova Pharma', value: 1800000, stage: 'closed_lost', probability: 0, priority: 'medium', expectedClose: '2026-08-20T00:00:00Z', owner: 'Dasun Perera', product: 'Medical Equipment', lastUpdated: '2026-08-20T13:30:00Z' },
  { id: 'DEAL-008', title: 'Custom Tooling Order', customerId: 'CUST-006', customerName: 'Charith Jayasuriya', company: 'AquaTech Solutions', value: 950000, stage: 'negotiation', probability: 65, priority: 'medium', expectedClose: '2026-09-25T00:00:00Z', owner: 'Dasun Perera', product: 'Custom Manufacturing', lastUpdated: '2026-09-02T09:00:00Z' }
];

async function seed() {
  console.log('Seeding Customers...');
  for (const c of customers) {
    try { await db.query('INSERT IGNORE INTO customers SET ?', c); } catch (e) {}
  }
  
  console.log('Seeding Leads...');
  for (const l of leads) {
    try { await db.query('INSERT IGNORE INTO leads SET ?', l); } catch (e) {}
  }

  console.log('Seeding Deals...');
  for (const d of deals) {
    try { await db.query('INSERT IGNORE INTO deals SET ?', d); } catch (e) {}
  }

  console.log('Done!');
  process.exit(0);
}

seed();

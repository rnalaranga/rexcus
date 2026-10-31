export interface PermissionItem {
  id: string;
  label: string;
  description: string;
}

export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  badgeColor?: string;
  permissions: PermissionItem[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'crm',
    name: 'CRM & Customer Relations',
    description: 'Manage customers, leads, sales pipeline, and follow-ups',
    badgeColor: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    permissions: [
      { id: 'crm.customers.view', label: 'View Customers', description: 'Access customer list, contacts, and basic profile info' },
      { id: 'crm.customers.create', label: 'Create Customers', description: 'Add new customer accounts and initial details' },
      { id: 'crm.customers.edit', label: 'Edit Customers', description: 'Update customer contact info, billing addresses, and tags' },
      { id: 'crm.customers.delete', label: 'Delete Customers', description: 'Remove customer profiles from the system' },
      { id: 'crm.credit.request', label: 'Credit Limit & Terms', description: 'Modify customer credit limits and payment terms' },
      { id: 'crm.leads.view', label: 'View Leads & Inquiries', description: 'Access incoming inquiries, lead pipeline stages, and contact cards' },
      { id: 'crm.leads.create', label: 'Create Leads', description: 'Register new customer leads and initial inquiry requirements' },
      { id: 'crm.leads.edit', label: 'Edit & Qualify Leads', description: 'Update lead stages, qualify leads, and log communications' },
      { id: 'crm.leads.delete', label: 'Delete Leads', description: 'Remove obsolete or spam leads from pipeline' },
      { id: 'crm.leads.manage', label: 'Manage Leads & Pipeline', description: 'Comprehensive lead administration, assignments, and conversion to customers' },
      { id: 'crm.deals.manage', label: 'Pipeline & Deals', description: 'Track deal stages, values, and sales milestones' },
      { id: 'crm.followups.manage', label: 'Follow-ups & Reminders', description: 'Log interactions, call notes, and schedule client reminders' }
    ]
  },
  {
    id: 'quotations',
    name: 'Quotations & Estimates',
    description: 'Generate, price, approve, and issue commercial quotations',
    badgeColor: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    permissions: [
      { id: 'quotations.view', label: 'View Quotations', description: 'Browse and inspect existing quotations and status' },
      { id: 'quotations.view_all', label: 'View All Quotations (Sales Head / Management)', description: 'View all quotations created across the entire company/sales team' },
      { id: 'quotations.view_own', label: 'View Own Quotations Only (Sales Rep)', description: 'Restricts user to only see quotations created by themselves' },
      { id: 'quotations.create', label: 'Create Quotations', description: 'Draft new quotations with line items and custom pricing' },
      { id: 'quotations.edit', label: 'Edit Quotations', description: 'Modify draft quotes, adjust quantities, and unit prices' },
      { id: 'quotations.delete', label: 'Delete Quotations', description: 'Cancel or delete unconfirmed quotations' },
      { id: 'quotations.approve', label: 'Approve Quotations', description: 'Authorize discounts and mark quotations as Approved' },
      { id: 'quotations.discount', label: 'Special Discounts', description: 'Apply discretionary line-item and overall discounts' },
      { id: 'quotations.print', label: 'Print & PDF Export', description: 'Generate formatted print layouts and downloadable quotation PDFs' }
    ]
  },
  {
    id: 'finance',
    name: 'Finance, Invoicing & Banking',
    description: 'Invoicing, receipts, bank accounts, ledger entries, and tax reports',
    badgeColor: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    permissions: [
      { id: 'finance.invoices.view', label: 'View Invoices', description: 'Browse invoices, payment statuses, and due snapshots' },
      { id: 'finance.invoices.create', label: 'Generate Invoices', description: 'Create and issue customer tax invoices from orders or scratch' },
      { id: 'finance.invoices.edit', label: 'Edit Invoices', description: 'Amend draft invoices, terms, and tax configurations' },
      { id: 'finance.invoices.delete', label: 'Delete / Cancel Invoices', description: 'Cancel or void issued customer invoices' },
      { id: 'finance.payments.record', label: 'Record Payments', description: 'Post customer payments, allocate to invoices, and issue receipts' },
      { id: 'finance.banking.view', label: 'View Banking', description: 'Access bank accounts, current balances, and statement logs' },
      { id: 'finance.banking.manage', label: 'Manage Banking & Transfers', description: 'Create bank accounts, transfer funds, and reconcile statements' },
      { id: 'finance.accounting.view', label: 'General Ledger & COA', description: 'Inspect chart of accounts and debit/credit ledger transactions' },
      { id: 'finance.journals.create', label: 'Post Journal Entries', description: 'Create and submit manual double-entry accounting journals' },
      { id: 'finance.receivables.view', label: 'Receivables & Ageing', description: 'Monitor customer receivables balances and aged outstanding invoices' },
      { id: 'finance.payables.view', label: 'Payables & Ageing', description: 'Monitor supplier vendor payables and overdue purchase bills' },
      { id: 'finance.tax.manage', label: 'Tax Management & VAT', description: 'Configure corporate tax rules, SSCL, VAT rates and generate tax schedules' },
      { id: 'finance.reports.view', label: 'Financial & Tax Reports', description: 'Generate Profit & Loss, Balance Sheet, and VAT/SSCL returns' }
    ]
  },
  {
    id: 'production',
    name: 'Production & Manufacturing',
    description: 'Work orders, job scheduling, CNC machining, and quality control',
    badgeColor: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
    permissions: [
      { id: 'production.work_orders.view', label: 'View Work Orders', description: 'Track active job cards, production batches, and delivery deadlines' },
      { id: 'production.work_orders.create', label: 'Create Work Orders', description: 'Issue new production work orders and bill of materials' },
      { id: 'production.work_orders.edit', label: 'Update Progress & Work Orders', description: 'Log completed stages, material consumption, and job status' },
      { id: 'production.work_orders.delete', label: 'Cancel / Delete Work Orders', description: 'Abort or remove work orders from the floor' },
      { id: 'production.machining.manage', label: 'Machining & CNC Operations', description: 'Assign tasks to machines, log cycle times, and machine status' },
      { id: 'production.planning.view', label: 'Production Planning', description: 'Access production timeline, machine capacity, and scheduling' },
      { id: 'production.qc.manage', label: 'Quality Control (QC)', description: 'Conduct QA inspections, sign off tolerances, and reject defective units' },
      { id: 'production.machinery.manage', label: 'Machinery & Equipment', description: 'Setup CNC machine profiles, operational capacity, and maintenance schedules' },
      { id: 'production.operations.manage', label: 'Routing & Operation Times', description: 'Configure standard machining steps, runtimes, and process routing' }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory & Warehousing',
    description: 'Item catalogs, stock levels, stock adjustments, and gate passes',
    badgeColor: 'border-purple-500/20 bg-purple-500/10 text-purple-400',
    permissions: [
      { id: 'inventory.items.view', label: 'View Stock Catalog', description: 'View raw materials, finished goods, and live stock on hand' },
      { id: 'inventory.items.view_details', label: 'Inspect Item Specifications', description: 'Inspect full item specifications, dimensions, cost rollups, and mapped suppliers in read-only mode' },
      { id: 'inventory.items.create', label: 'Add Inventory Items', description: 'Register new stock items, categories, and unit measurements' },
      { id: 'inventory.items.edit', label: 'Edit Inventory Items', description: 'Update item descriptions, standard costs, and reorder levels' },
      { id: 'inventory.items.delete', label: 'Delete Inventory Items', description: 'Remove discontinued or obsolete stock items' },
      { id: 'inventory.ledger.manage', label: 'Stock Adjustments & Transfers', description: 'Record manual stock count corrections and bin transfers' },
      { id: 'inventory.stock_ledger.view', label: 'View Stock Ledger & Audit', description: 'Inspect complete historical stock in/out transaction ledger and bin movements' },
      { id: 'inventory.customer_grn.manage', label: 'Customer Material GRN', description: 'Accept and log customer-supplied materials for processing' },
      { id: 'inventory.gatepass.manage', label: 'Gate Passes (RGP & NRGP)', description: 'Create and authorize returnable and non-returnable gate passes' },
      { id: 'inventory.assets.manage', label: 'Factory Assets & Tooling', description: 'Manage company machinery assets, capital equipment, and tooling registry' }
    ]
  },
  {
    id: 'purchasing',
    name: 'Purchasing & Procurement',
    description: 'Supplier directory, material requests, purchase orders, and vendor bills',
    badgeColor: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
    permissions: [
      { id: 'purchasing.suppliers.view', label: 'View Suppliers', description: 'Access vendor directory, contacts, and historical supply logs' },
      { id: 'purchasing.suppliers.manage', label: 'Manage Suppliers', description: 'Add, update, or blacklist vendor records' },
      { id: 'purchasing.mr.manage', label: 'Material Requisitions (MR)', description: 'Create and submit internal material purchase requisitions' },
      { id: 'purchasing.po.manage', label: 'Purchase Orders (PO)', description: 'Draft, approve, and send purchase orders to suppliers' },
      { id: 'purchasing.grn.manage', label: 'Supplier GRN Inspection', description: 'Record incoming supplier goods receipt and verify deliveries' },
      { id: 'purchasing.bills.manage', label: 'Supplier Bills & Payables', description: 'Log vendor invoices and prepare accounts payable disbursements' }
    ]
  },
  {
    id: 'hr',
    name: 'Human Resources & Workforce',
    description: 'Employee profiles, labor attendance, technician skills matrix, and workforce allocation',
    badgeColor: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
    permissions: [
      { id: 'hr.employees.view', label: 'View Employees', description: 'Access staff directory, job designations, and department listings' },
      { id: 'hr.employees.create', label: 'Add New Employees', description: 'Register new personnel, emergency contacts, and compensation packages' },
      { id: 'hr.employees.edit', label: 'Edit Employee Records', description: 'Update employee designation, basic salary, allowances, and job status' },
      { id: 'hr.employees.delete', label: 'Deactivate / Remove Employee', description: 'Archive, deactivate, or delete employee personnel profiles' },
      { id: 'hr.skills.manage', label: 'Technician Skills Matrix', description: 'Assign machining skills, machine qualifications, and skill ratings' },
      { id: 'hr.labor_report.view', label: 'Labor Efficiency & Reports', description: 'Analyze production man-hours, labor efficiency, and attendance logs' }
    ]
  },
  {
    id: 'approvals',
    name: 'Approvals & Authorizations',
    description: 'Grant authority to review, approve, or reject commercial quotes, credit limits, orders, and payments',
    badgeColor: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    permissions: [
      { id: 'approvals.quotations', label: 'Approve Quotations', description: 'Review and approve draft quotations before they can be sent or issued to customers' },
      { id: 'approvals.discounts', label: 'Discounts & Margin Overrides', description: 'Authorize discretionary line-item and overall discounts on quotes and sales' },
      { id: 'approvals.credit_limit', label: 'Customer Credit Limits & Terms', description: 'Approve customer credit limit increases, credit periods, and advance waivers' },
      { id: 'approvals.purchase_orders', label: 'Purchase Orders (PO) Authorization', description: 'Approve vendor purchase orders before dispatching to suppliers' },
      { id: 'approvals.material_requests', label: 'Material Requisitions (MR)', description: 'Approve store material requests and workshop requisition slips' },
      { id: 'approvals.bills_payments', label: 'Supplier Bills & Payment Release', description: 'Approve supplier bills and accounts payable payment disbursements' },
      { id: 'approvals.work_orders', label: 'Production Work Order Release', description: 'Approve production job cards for release to factory floor' },
      { id: 'approvals.sales_order_edit', label: 'Sales Order Edit / Change Approval', description: 'Authorize changes and modifications to confirmed Sales Orders' }
    ]
  },
  {
    id: 'admin',
    name: 'Administration & System Controls',
    description: 'User access, custom roles, master settings, and audit security',
    badgeColor: 'border-rex-500/20 bg-rex-500/10 text-rex-400',
    permissions: [
      { id: 'admin.users.manage', label: 'Manage Users & Passwords', description: 'Create user logins, reset passwords, and toggle active status' },
      { id: 'admin.roles.manage', label: 'Manage Roles & Permissions', description: 'Create custom roles, edit permission matrices, and assign rights' },
      { id: 'admin.approvals.manage', label: 'Approvals Hub Access', description: 'Access Central Approvals Hub to review all pending quotes and requests' },
      { id: 'admin.settings.manage', label: 'System & Company Settings', description: 'Modify company branding, TIN, VAT numbers, and defaults' },
      { id: 'admin.database.backup', label: 'Database & Maintenance', description: 'Trigger database backups, audit trail inspection, and diagnostics' }
    ]
  }
];

export const ALL_PERMISSION_IDS: string[] = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.id));

// Map alias permissions for seamless backwards compatibility
const PERMISSION_ALIASES: Record<string, string[]> = {
  'quotations.view_all': ['quotations.view_all'],
  'quotations.view_own': ['quotations.view_own', 'quotations.view'],
  'quotations.approve': ['approvals.quotations', 'quotations.approve'],
  'approvals.quotations': ['approvals.quotations', 'quotations.approve'],
  'quotations.discount': ['approvals.discounts', 'quotations.discount'],
  'approvals.discounts': ['approvals.discounts', 'quotations.discount'],
  'crm.credit.approve': ['approvals.credit_limit', 'crm.credit.request', 'crm.credit.approve'],
  'approvals.credit_limit': ['approvals.credit_limit', 'crm.credit.request', 'crm.credit.approve'],
  'purchasing.po.approve': ['approvals.purchase_orders', 'purchasing.po.manage'],
  'approvals.purchase_orders': ['approvals.purchase_orders', 'purchasing.po.manage'],
  'purchasing.mr.approve': ['approvals.material_requests', 'purchasing.mr.manage'],
  'approvals.material_requests': ['approvals.material_requests', 'purchasing.mr.manage'],
  'finance.bills.approve': ['approvals.bills_payments', 'finance.invoices.edit', 'purchasing.bills.manage'],
  'approvals.bills_payments': ['approvals.bills_payments', 'finance.invoices.edit', 'purchasing.bills.manage'],
  'production.work_orders.approve': ['approvals.work_orders', 'production.work_orders.create', 'production.work_orders.edit'],
  'approvals.work_orders': ['approvals.work_orders', 'production.work_orders.create', 'production.work_orders.edit'],
  'inventory.items.view_details': ['inventory.items.view_details', 'inventory.items.view'],
  'inventory.stock_ledger.view': ['inventory.stock_ledger.view', 'inventory.ledger.manage', 'inventory.items.view'],
  'crm.leads.view': ['crm.leads.view', 'crm.leads.manage'],
  'crm.leads.create': ['crm.leads.create', 'crm.leads.manage'],
  'crm.leads.edit': ['crm.leads.edit', 'crm.leads.manage'],
  'crm.leads.delete': ['crm.leads.delete', 'crm.leads.manage'],
  'crm.leads.manage': ['crm.leads.manage', 'crm.leads.view'],
  'sales_orders.edit': ['approvals.sales_order_edit', 'production.work_orders.edit', 'sales_orders.edit'],
  'approvals.sales_order_edit': ['approvals.sales_order_edit', 'sales_orders.edit'],
  'admin.approvals.manage': [
    'approvals.sales_order_edit',
    'admin.approvals.manage',
    'approvals.quotations',
    'quotations.approve',
    'approvals.discounts',
    'approvals.credit_limit',
    'approvals.purchase_orders',
    'approvals.material_requests',
    'approvals.bills_payments',
    'approvals.work_orders'
  ]
};

export const hasPermission = (
  userPermissions: string[] | undefined,
  requiredPermission: string,
  userRole?: string
): boolean => {
  if (userRole === 'admin') return true;

  // STRICT POLICY: Quotation, Invoice, Sales Order, Work Order, PO, MR, and GRN deletion is EXCLUSIVELY reserved for Admin.
  if (
    requiredPermission === 'quotations.delete' ||
    requiredPermission === 'invoices.delete' ||
    requiredPermission === 'sales_orders.delete' ||
    requiredPermission === 'work_orders.delete' ||
    requiredPermission === 'finance.invoices.delete' ||
    requiredPermission === 'purchasing.pos.delete' ||
    requiredPermission === 'purchasing.grns.delete' ||
    requiredPermission === 'purchasing.mrs.delete'
  ) {
    return false;
  }

  // CRM Manager and Head of Sales have complete CRM and quotation approval rights (except deletion)
  if (userRole === 'crm_manager' || userRole === 'sales_head') {
    if (
      requiredPermission.startsWith('crm.') ||
      requiredPermission.startsWith('quotations.') ||
      requiredPermission.startsWith('approvals.quotations') ||
      requiredPermission === 'admin.approvals.manage' ||
      requiredPermission === 'approvals.discounts' ||
      requiredPermission === 'inventory.customer_grn.manage' ||
      requiredPermission === 'inventory.customer_grn.view' ||
      requiredPermission === 'inventory.items.view'
    ) {
      return true;
    }
  }

  // General Manager has broad operational rights (except deletion of core records)
  if (userRole === 'manager') {
    if (!requiredPermission.startsWith('admin.database') && !requiredPermission.startsWith('admin.users')) {
      return true;
    }
  }

  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes('*')) return true;

  const aliases = PERMISSION_ALIASES[requiredPermission] || [requiredPermission];
  return aliases.some(alias => userPermissions.includes(alias));
};


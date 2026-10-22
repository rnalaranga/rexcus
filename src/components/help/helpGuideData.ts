export interface HelpWorkflowStep {
  stepNumber: number;
  title: string;
  description: string;
  actor: string;
  statusBadge?: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'indigo' | 'cyan';
  nextSteps?: string[];
}

export interface HelpActionItem {
  name: string;
  badge?: string;
  description: string;
  howTo: string;
  rolesAllowed?: string;
}

export interface HelpGuideItem {
  id: string;
  routePatterns: string[];
  title: string;
  category: string;
  iconName: string;
  summary: string;
  workflowDiagram: {
    title: string;
    subtitle: string;
    steps: HelpWorkflowStep[];
  };
  actions: HelpActionItem[];
  tips: string[];
  faq: { question: string; answer: string }[];
  relatedModules?: { title: string; route: string }[];
}

export const HELP_GUIDES: HelpGuideItem[] = [
  // 1. Normal Quotations
  {
    id: 'crm-quotations',
    routePatterns: ['/crm/quotations', '/quotations'],
    title: 'Custom Engineering Quotations (BOM & Costing)',
    category: 'CRM & Sales',
    iconName: 'FileText',
    summary: 'The Quotations module enables sales and engineering teams to prepare multi-part engineering quotations with automated BOM calculations (steel plates, shafts, rods), manual materials, machining labor rates, and manager approvals.',
    workflowDiagram: {
      title: 'Quotation to Delivery Lifecycle Flow',
      subtitle: 'Complete flow from customer inquiry to work order and billing',
      steps: [
        {
          stepNumber: 1,
          title: 'Draft Quote Creation',
          description: 'Engineer or Sales Rep builds quote with BOMs, materials, machining hours, and profit margins.',
          actor: 'Sales / Estimator',
          statusBadge: 'Draft',
          color: 'amber',
          nextSteps: ['Submit for Manager Approval']
        },
        {
          stepNumber: 2,
          title: 'Manager Approval Review',
          description: 'Quotation is reviewed in Central Approvals Hub for technical feasibility, margins, and credit limits.',
          actor: 'Manager / Admin',
          statusBadge: 'Pending Approval',
          color: 'purple',
          nextSteps: ['Approved', 'Rejected (Reason Logged)']
        },
        {
          stepNumber: 3,
          title: 'Client Submission & Acceptance',
          description: 'Official quote PDF is emailed or presented to client. Client accepts quotation terms.',
          actor: 'Client / Sales Rep',
          statusBadge: 'Approved / Sent',
          color: 'emerald',
          nextSteps: ['Commercial Sales Order', 'Advance Receipt']
        },
        {
          stepNumber: 4,
          title: 'Sales Order & Advance Receipt',
          description: 'Official commercial Sales Order is generated. Advance payment receipt is issued to customer.',
          actor: 'Sales / Finance',
          statusBadge: 'SO Confirmed',
          color: 'blue',
          nextSteps: ['Work Order in Production']
        },
        {
          stepNumber: 5,
          title: 'Production Work Order',
          description: 'Work order is generated from approved quote BOM and released to the machine shop floor.',
          actor: 'Production Planner',
          statusBadge: 'In Production',
          color: 'indigo',
          nextSteps: ['Material Issue', 'Machining']
        },
        {
          stepNumber: 6,
          title: 'Invoicing & Sample GRN',
          description: 'Tax invoice is generated with VAT/SSCL profiles. Sample GRN printed if physical sample was provided.',
          actor: 'Accounts & Store',
          statusBadge: 'Invoiced',
          color: 'cyan',
          nextSteps: ['Payment Settlement']
        }
      ]
    },
    actions: [
      {
        name: 'Preview (1-Click)',
        badge: 'Eye',
        description: 'Opens a high-fidelity printable quotation view matching Rex Industries official letterhead.',
        howTo: 'Click the "Preview" button on any quotation row. Allows quick printing or PDF export.'
      },
      {
        name: 'Actions ▾ > Edit in Builder',
        badge: 'FileEdit',
        description: 'Opens the quotation in the full Quotation Builder to modify BOMs, plate dimensions, labor rates, and discounts.',
        howTo: 'Click Actions ▾ and choose "Edit in Quotation Builder". Saves new changes as revisions.'
      },
      {
        name: 'Actions ▾ > Create Sales Order',
        badge: 'ShoppingBag',
        description: 'Converts an Approved Quotation directly into an official Commercial Sales Order with auto-populated customer details and quoted items.',
        howTo: 'Available once quotation status is Approved. Click Actions ▾ and select "Create Sales Order". Takes you to Sales Orders Hub.'
      },
      {
        name: 'Actions ▾ > Issue Advance Receipt',
        badge: 'Receipt',
        description: 'Issues an official numbered Advance Payment Receipt with payment method (Cash, Bank Transfer, Cheque) and auto-updates advance ledger.',
        howTo: 'Click Actions ▾ and choose "Issue Advance Receipt". Fill payment amount and reference.'
      },
      {
        name: 'Actions ▾ > Create Work Order',
        badge: 'Factory',
        description: 'Instantly transfers BOM parts, auto-materials, and machining operations into a shop-floor Work Order.',
        howTo: 'Available for Approved quotations. Click Actions ▾ > "Create Work Order". Duplicates are automatically prevented.'
      },
      {
        name: 'Actions ▾ > Generate Tax Invoice',
        badge: 'FileText',
        description: 'Transfers the quotation directly into the Invoice Builder with pre-selected customer, line items, and tax rates without any browser alert popups.',
        howTo: 'Click Actions ▾ > "Generate Tax Invoice".'
      },
      {
        name: 'Actions ▾ > Sample GRN',
        badge: 'Package',
        description: 'Records customer samples received for testing/replication, prints official Customer Sample GRN.',
        howTo: 'Click Actions ▾ > "Receive Sample (GRN)" or "Print Sample GRN".'
      },
      {
        name: 'Revisions Toggle ({count} revisions ▾)',
        badge: 'History',
        description: 'Toggles a compact history panel showing all previous versions (v1, v2, v3) of this quotation with individual view/edit/delete options.',
        howTo: 'Click the revisions pill in the quotation row.'
      }
    ],
    tips: [
      'To combine multiple quotes into one final client quote, check the boxes next to the quote numbers and click "Make Final Quote" at the top.',
      'Quotations must be Approved before changing status to Sent or In Production.',
      'Use the quick date range buttons ("This Month", "Last 30 Days") in the filter bar to isolate recent activity.',
      'BOM costing can be inspected anytime by clicking "View Costing" under the quoted item description.'
    ],
    faq: [
      {
        question: 'Why is the "Create Sales Order" button disabled or not visible?',
        answer: 'Sales Orders can only be generated from quotations that are in Approved, Sent, Accepted, or In Production status. If the quote is still Draft or Pending Approval, approve it first.'
      },
      {
        question: 'How do I submit a quote for manager approval?',
        answer: 'Open the Actions ▾ dropdown and click "Submit for Approval". The quote will instantly show up in Central Approvals Hub for manager review.'
      },
      {
        question: 'Can I delete a specific version without deleting the whole quote?',
        answer: 'Yes! Expand the revisions pill and click the trash icon next to the specific version (e.g. v1) you want to remove.'
      }
    ],
    relatedModules: [
      { title: 'Sales Orders Hub', route: '/crm/sales-orders' },
      { title: 'Central Approvals Hub', route: '/admin/approvals' },
      { title: 'Production Work Orders', route: '/production' },
      { title: 'Invoices', route: '/finance/invoices' }
    ]
  },

  // 2. Product Quotations
  {
    id: 'crm-product-quotations',
    routePatterns: ['/crm/product-quotations', '/product-quotations'],
    title: 'Product Quotations (Finished Goods Catalog)',
    category: 'CRM & Sales',
    iconName: 'PackageCheck',
    summary: 'Used for standard finished goods and ready-made inventory items. Allows quick selection of stocked SKUs, custom quantity pricing, tax profiles, and direct conversion to sales orders or invoices.',
    workflowDiagram: {
      title: 'Finished Goods Quoting Flow',
      subtitle: 'Standardized workflow for ready-to-sell catalog products',
      steps: [
        {
          stepNumber: 1,
          title: 'Create Catalog Quote',
          description: 'Select customer, search and pick ready-made finished goods items, set quantities and unit prices.',
          actor: 'Sales Rep',
          statusBadge: 'Draft',
          color: 'emerald',
          nextSteps: ['Submit for Approval']
        },
        {
          stepNumber: 2,
          title: 'Approval Check',
          description: 'Manager validates customer creditworthiness, discount percentages, and availability.',
          actor: 'Manager',
          statusBadge: 'Pending Approval',
          color: 'purple',
          nextSteps: ['Approved']
        },
        {
          stepNumber: 3,
          title: 'Commercial Sales Order',
          description: '1-click conversion to Commercial Sales Order with stock reservation from finished goods warehouse.',
          actor: 'Sales Coordinator',
          statusBadge: 'SO Created',
          color: 'blue',
          nextSteps: ['Advance Receipt', 'Dispatch']
        },
        {
          stepNumber: 4,
          title: 'Dispatch & Invoicing',
          description: 'Goods are packaged, Gate Pass is generated, and Tax Invoice is issued to customer.',
          actor: 'Store & Accounts',
          statusBadge: 'Invoiced / Dispatched',
          color: 'indigo',
          nextSteps: ['Settlement']
        }
      ]
    },
    actions: [
      {
        name: 'Preview',
        badge: 'Eye',
        description: 'View full formatted quotation document with Rex header, item specifications, and terms.',
        howTo: 'Click "Preview" on any product quotation row.'
      },
      {
        name: 'Actions ▾ > Create Sales Order',
        badge: 'ShoppingBag',
        description: 'Creates a finished goods sales order with automatic SKU mapping and delivery dates.',
        howTo: 'Click Actions ▾ and click "Create Sales Order".'
      },
      {
        name: 'Actions ▾ > Issue Advance Receipt',
        badge: 'Receipt',
        description: 'Record an advance deposit against the product quotation with official receipt printout.',
        howTo: 'Click Actions ▾ and choose "Issue Advance Receipt".'
      },
      {
        name: 'Actions ▾ > Generate Tax Invoice',
        badge: 'FileText',
        description: 'Opens Tax Invoice Builder with pre-loaded product lines, customer details, and tax breakdowns.',
        howTo: 'Click Actions ▾ > "Generate Tax Invoice".'
      }
    ],
    tips: [
      'Product quotations allow direct lookup from inventory stock items with real-time stock availability indicators.',
      'Click the revisions button to inspect price changes between quotation versions.'
    ],
    faq: [
      {
        question: 'What is the difference between Normal Quotation and Product Quotation?',
        answer: 'Normal Quotations are for custom-machined engineering jobs requiring raw materials (plates, shafts), CNC hours, and custom BOM costing. Product Quotations are for standardized finished goods already cataloged with SKU numbers.'
      }
    ],
    relatedModules: [
      { title: 'Normal Quotations', route: '/crm/quotations' },
      { title: 'Sales Orders', route: '/crm/sales-orders' },
      { title: 'Finished Goods Inventory', route: '/inventory' }
    ]
  },

  // 3. Sales Orders Hub
  {
    id: 'crm-sales-orders',
    routePatterns: ['/crm/sales-orders', '/sales-orders'],
    title: 'Commercial Sales Orders & Dispatch Hub',
    category: 'Sales & Inventory',
    iconName: 'ShoppingBag',
    summary: 'Central hub for tracking customer sales orders, managing stock availability, generating shop-floor work orders for shortages, issuing advance receipts, generating invoices, and issuing Gate Passes.',
    workflowDiagram: {
      title: 'Sales Order to Delivery Flow',
      subtitle: 'From confirmed customer order to delivery gate pass',
      steps: [
        {
          stepNumber: 1,
          title: 'Order Confirmation',
          description: 'Sales Order generated from Approved Quotation or created as a direct ready-made order.',
          actor: 'Sales Coordinator',
          statusBadge: 'Confirmed',
          color: 'blue',
          nextSteps: ['Stock Availability Check']
        },
        {
          stepNumber: 2,
          title: 'Stock Allocation / Work Order',
          description: 'System checks warehouse stock. If shortage exists, a Production Work Order is created with 1 click.',
          actor: 'Storekeeper / Production',
          statusBadge: 'In Stock / Production',
          color: 'indigo',
          nextSteps: ['Advance Payment Receipt']
        },
        {
          stepNumber: 3,
          title: 'Advance Payment Receipt',
          description: 'Customer advance is collected and official receipt is issued.',
          actor: 'Cashier / Finance',
          statusBadge: 'Advance Received',
          color: 'emerald',
          nextSteps: ['Invoice Generation']
        },
        {
          stepNumber: 4,
          title: 'Tax Invoice & Dispatch',
          description: 'Tax Invoice generated. Storekeeper fills driver & vehicle details to print the official Gate Pass.',
          actor: 'Store & Security',
          statusBadge: 'Dispatched',
          color: 'purple',
          nextSteps: ['Delivered']
        }
      ]
    },
    actions: [
      {
        name: 'Quick PDF (1-Click)',
        badge: 'Printer',
        description: 'Instant print or download of the official Sales Order document with commercial terms.',
        howTo: 'Click the "PDF" button on the order row.'
      },
      {
        name: 'Actions ▾ > Create Work Order',
        badge: 'Factory',
        description: 'Generates a production Work Order for shortage items or custom job orders.',
        howTo: 'Click Actions ▾ > "Create Work Order".'
      },
      {
        name: 'Actions ▾ > Issue Advance Receipt',
        badge: 'Receipt',
        description: 'Issue official receipt against this order.',
        howTo: 'Click Actions ▾ > "Issue Advance Receipt".'
      },
      {
        name: 'Actions ▾ > Dispatch & Gate Pass',
        badge: 'Truck',
        description: 'Opens the Dispatch Modal to record carrier, vehicle registration number, driver name, and print official Gate Pass.',
        howTo: 'Click Actions ▾ > "Dispatch & Gate Pass". Once dispatched, click "View Gate Pass" anytime.'
      },
      {
        name: 'Actions ▾ > Generate Invoice',
        badge: 'FileText',
        description: 'Directly loads the Invoice Builder with order items, prices, and customer details.',
        howTo: 'Click Actions ▾ > "Generate / View Invoice".'
      }
    ],
    tips: [
      'The "Stock Check" column shows green "In Stock" or amber "Shortage (X req)" to immediately alert you if production is needed.',
      'Gate passes carry a unique GP number and timestamp required by factory security.'
    ],
    faq: [
      {
        question: 'Can I reprint a Gate Pass after dispatching?',
        answer: 'Yes! In the Actions ▾ dropdown, click "View Gate Pass ({GP-Number})" to view or print the security gate pass at any time.'
      }
    ],
    relatedModules: [
      { title: 'Production Work Orders', route: '/production' },
      { title: 'Invoices', route: '/finance/invoices' },
      { title: 'Store Dispatch', route: '/inventory/material-issue' }
    ]
  },

  // 4. Central Approvals Hub
  {
    id: 'admin-approvals',
    routePatterns: ['/admin/approvals'],
    title: 'Central Approvals Hub & Audit Trail',
    category: 'Management & Governance',
    iconName: 'Shield',
    summary: 'The Central Approvals Hub provides managers and executives with full visibility and control over pending quotations, customer credit limit increases, and a permanent, immutable approval audit history log.',
    workflowDiagram: {
      title: 'Approval & Governance Process',
      subtitle: 'Manager review, decision logging, and system-wide state sync',
      steps: [
        {
          stepNumber: 1,
          title: 'Request Submission',
          description: 'Sales or CRM user submits a quotation or credit limit increase request for manager authorization.',
          actor: 'Requesting User',
          statusBadge: 'Pending Approval',
          color: 'amber',
          nextSteps: ['Manager Review']
        },
        {
          stepNumber: 2,
          title: 'Manager Evaluation',
          description: 'Manager inspects quote details, margins, customer outstanding balances, and terms.',
          actor: 'Manager / Director',
          statusBadge: 'In Review',
          color: 'blue',
          nextSteps: ['Approve / Reject Decision']
        },
        {
          stepNumber: 3,
          title: 'Decision & Audit Logging',
          description: 'Manager clicks Approve or Reject. Rejections require mandatory reason. Decision logged to database audit trail.',
          actor: 'Manager & System',
          statusBadge: 'Approved / Rejected',
          color: 'emerald',
          nextSteps: ['Status updated in CRM', 'History Log created']
        },
        {
          stepNumber: 4,
          title: 'Historical Audit Trail',
          description: 'All past decisions, approver names, reasons, and timestamps remain accessible in the History Log tab.',
          actor: 'Auditor / Compliance',
          statusBadge: 'Logged',
          color: 'purple',
          nextSteps: []
        }
      ]
    },
    actions: [
      {
        name: 'Quotation Approvals Tab',
        badge: 'FileText',
        description: 'Lists all pending quotations awaiting manager sign-off. Shows customer, total amount, and submitter.',
        howTo: 'Review details, click "Approve" (green) or "Reject" (red) with reason.'
      },
      {
        name: 'Credit Limit Requests Tab',
        badge: 'CreditCard',
        description: 'Reviews requests to grant or increase customer credit limits above default thresholds.',
        howTo: 'Inspect requested amount, current balance, and approve/reject.'
      },
      {
        name: 'Approval History Log Tab',
        badge: 'History',
        description: 'Complete chronological history of every approval decision made across the organization with approver names and reasons.',
        howTo: 'Switch to the 3rd tab to filter and audit past approvals.'
      }
    ],
    tips: [
      'Managers can directly approve quotations from this hub without having to navigate into individual CRM records.',
      'When rejecting a quotation, entering a clear reason helps the estimator revise and resubmit properly.'
    ],
    faq: [
      {
        question: 'Who is allowed to approve quotations?',
        answer: 'Users with the "approvals.quotations" permission or Admin/Manager roles have approval rights.'
      }
    ],
    relatedModules: [
      { title: 'Quotations', route: '/crm/quotations' },
      { title: 'Customers', route: '/crm/customers' },
      { title: 'User Roles & Permissions', route: '/admin/roles' }
    ]
  },

  // 5. Production Work Orders
  {
    id: 'production-work-orders',
    routePatterns: ['/production', '/production/work-orders'],
    title: 'Production & Shop Floor Work Orders',
    category: 'Manufacturing',
    iconName: 'Factory',
    summary: 'Manages manufacturing work orders, BOM component tracking, machine shop routing operations, labor logging, and progress from Raw Material Issue to Finished Goods.',
    workflowDiagram: {
      title: 'Shop Floor Manufacturing Process',
      subtitle: 'From work order release to finished goods stocking',
      steps: [
        {
          stepNumber: 1,
          title: 'Work Order Release',
          description: 'Created from Approved Quote or Sales Order. Priority, due date, and job quantities assigned.',
          actor: 'Production Manager',
          statusBadge: 'Scheduled',
          color: 'blue',
          nextSteps: ['Material Issue Station']
        },
        {
          stepNumber: 2,
          title: 'Material Issue & Cutting',
          description: 'Store releases specified raw steel plates, rods, and hardware to the machining department.',
          actor: 'Storekeeper',
          statusBadge: 'Materials Issued',
          color: 'indigo',
          nextSteps: ['Machining Operations']
        },
        {
          stepNumber: 3,
          title: 'Machining & Fabrication',
          description: 'Operators perform Turning, Milling, Boring, Welding, Grinding with logged machine hours.',
          actor: 'Machinists / Operators',
          statusBadge: 'In Progress',
          color: 'amber',
          nextSteps: ['Quality Inspection']
        },
        {
          stepNumber: 4,
          title: 'Quality Check & Finish',
          description: 'Final dimensions inspected against technical drawings. Work order marked Completed.',
          actor: 'QC Inspector',
          statusBadge: 'Completed',
          color: 'emerald',
          nextSteps: ['Finished Goods Warehouse']
        }
      ]
    },
    actions: [
      {
        name: 'View Work Order Detail',
        badge: 'Eye',
        description: 'Inspect BOM items, planned vs actual machining hours, operator logs, and material requisitions.',
        howTo: 'Click any work order card or row.'
      },
      {
        name: 'Print Job Card / Route Sheet',
        badge: 'Printer',
        description: 'Prints shop-floor traveler document with barcode/number, drawings notes, and operation checklist.',
        howTo: 'Click Print Job Card from the work order detail screen.'
      },
      {
        name: 'Issue Materials',
        badge: 'Package',
        description: 'Issues raw materials from store ledger directly against this job.',
        howTo: 'Navigate to Material Issue Station or click Issue Materials on the work order.'
      }
    ],
    tips: [
      'Each work order tracks both Labor Rates and Machine Rates to calculate exact cost of goods manufactured (COGM).',
      'Always mark materials as issued before starting machining operations to keep inventory valuation synchronized.'
    ],
    faq: [
      {
        question: 'Can I add additional operations to a running work order?',
        answer: 'Yes! Open the Work Order Detail and click "Add Operation" to insert an extra machining or surface treatment step.'
      }
    ],
    relatedModules: [
      { title: 'Material Issue Station', route: '/inventory/material-issue' },
      { title: 'Inventory Hub', route: '/inventory' },
      { title: 'Machinery Planning', route: '/production/machinery' }
    ]
  },

  // 6. Invoices & Billing
  {
    id: 'finance-invoices',
    routePatterns: ['/finance/invoices', '/invoices'],
    title: 'Customer Tax Invoices & Receivables',
    category: 'Finance & Accounts',
    iconName: 'Receipt',
    summary: 'Handles official customer tax invoices, automated VAT (18%) and SSCL (2.5%) calculations, advance payment offset, and payment settlement tracking.',
    workflowDiagram: {
      title: 'Billing & Receivables Flow',
      subtitle: 'From quotation/order to tax invoice and payment settlement',
      steps: [
        {
          stepNumber: 1,
          title: 'Invoice Draft Creation',
          description: 'Loaded directly from Quotation, Sales Order, or created manually with custom items.',
          actor: 'Accountant / Billing Clerk',
          statusBadge: 'Draft',
          color: 'amber',
          nextSteps: ['Tax Profile Selection']
        },
        {
          stepNumber: 2,
          title: 'Tax & Discount Calculation',
          description: 'Standard VAT, SSCL, and withholding taxes computed automatically according to tax profile.',
          actor: 'Billing System',
          statusBadge: 'Calculated',
          color: 'blue',
          nextSteps: ['Issue Official Invoice']
        },
        {
          stepNumber: 3,
          title: 'Invoice Issuance & Dispatch',
          description: 'Official invoice number assigned. PDF printed or emailed directly to client.',
          actor: 'Accountant',
          statusBadge: 'Sent / Unpaid',
          color: 'purple',
          nextSteps: ['Payment Collection']
        },
        {
          stepNumber: 4,
          title: 'Payment Settlement',
          description: 'Customer payment recorded (cash, cheque, bank transfer). Invoice marked Paid or Partially Paid.',
          actor: 'Accounts Receivable',
          statusBadge: 'Paid',
          color: 'emerald',
          nextSteps: ['General Ledger Posting']
        }
      ]
    },
    actions: [
      {
        name: 'New Invoice (+)',
        badge: 'Plus',
        description: 'Creates a new manual invoice or opens the Invoice Builder for a specific customer.',
        howTo: 'Click "New Invoice" button in the top right.'
      },
      {
        name: 'Record Payment',
        badge: 'DollarSign',
        description: 'Applies payment to settle outstanding invoice balance.',
        howTo: 'Click "Record Payment" on any unpaid or partial invoice.'
      },
      {
        name: 'Export PDF / Print',
        badge: 'Printer',
        description: 'Prints official tax invoice with company TIN/VAT numbers and bank payment instructions.',
        howTo: 'Click "Print" on the invoice row.'
      }
    ],
    tips: [
      'Invoices generated from Quotations automatically populate the customer TIN, SVAT, and company details.',
      'Check the Receivables Aging report in Finance to view 30/60/90 days overdue balances.'
    ],
    faq: [
      {
        question: 'Does generating an invoice show a browser alert message?',
        answer: 'No. The invoice page now loads smoothly and directly without any disruptive browser popups or prompts.'
      }
    ],
    relatedModules: [
      { title: 'Quotations', route: '/crm/quotations' },
      { title: 'Sales Orders', route: '/crm/sales-orders' },
      { title: 'General Accounting', route: '/finance/accounting' }
    ]
  },

  // 7. Inventory & Stock Hub
  {
    id: 'inventory-stock',
    routePatterns: ['/inventory'],
    title: 'Raw Materials & Finished Goods Inventory',
    category: 'Inventory & Stores',
    iconName: 'Package',
    summary: 'Manages raw materials (steel plates, round shafts, bronze, fasteners), finished goods inventory, stock levels, reorder points, and linear cutting optimization.',
    workflowDiagram: {
      title: 'Inventory Flow Cycle',
      subtitle: 'From supplier GRN to material issue and finished goods storage',
      steps: [
        {
          stepNumber: 1,
          title: 'Stock Intake (GRN)',
          description: 'Raw materials received from suppliers via purchasing GRN and added to warehouse ledger.',
          actor: 'Storekeeper',
          statusBadge: 'Received',
          color: 'blue',
          nextSteps: ['Stock Valuation']
        },
        {
          stepNumber: 2,
          title: 'Stock Cutting & Prep',
          description: 'Linear stock cutting studio calculates optimal cuts from standard 6m bars/plates to minimize waste.',
          actor: 'Store Cutter',
          statusBadge: 'Available',
          color: 'indigo',
          nextSteps: ['Issue to Work Order']
        },
        {
          stepNumber: 3,
          title: 'Material Issue to Production',
          description: 'Raw materials issued against specific Work Order numbers and deducted from stock balance.',
          actor: 'Store Dispatcher',
          statusBadge: 'Issued',
          color: 'amber',
          nextSteps: ['Production']
        },
        {
          stepNumber: 4,
          title: 'Finished Goods Receipt',
          description: 'Completed products received from shop floor into finished goods warehouse ready for customer dispatch.',
          actor: 'Storekeeper',
          statusBadge: 'In Stock',
          color: 'emerald',
          nextSteps: ['Sales Order Dispatch']
        }
      ]
    },
    actions: [
      {
        name: 'Linear Stock Cut Studio',
        badge: 'Scissors',
        description: 'Optimizes cut patterns for steel rods and shafts to minimize off-cut waste.',
        howTo: 'Click "Linear Stock Cut Studio" button at the top of the inventory page.'
      },
      {
        name: 'Material Issue Station',
        badge: 'PackageCheck',
        description: 'Station for storekeepers to issue raw stock against active production jobs.',
        howTo: 'Click "Material Issue Station" or navigate to /inventory/material-issue.'
      },
      {
        name: 'Stock Ledger Hub',
        badge: 'History',
        description: 'Detailed movement audit showing every intake, issue, adjustment, and scrap record.',
        howTo: 'Click "Stock Ledger" tab.'
      }
    ],
    tips: [
      'Set reorder thresholds on high-demand raw stocks (e.g. Mild Steel 25mm shaft) to trigger automatic low-stock notifications.'
    ],
    faq: [
      {
        question: 'How do I add a new raw material?',
        answer: 'Click "Add Raw Material" or create it automatically through a Purchasing Goods Received Note (GRN).'
      }
    ],
    relatedModules: [
      { title: 'Material Issue Station', route: '/inventory/material-issue' },
      { title: 'Purchasing & GRN', route: '/purchasing' },
      { title: 'Work Orders', route: '/production' }
    ]
  },

  // 8. Material Issue & Store Dispatch
  {
    id: 'inventory-material-issue',
    routePatterns: ['/inventory/material-issue', '/material-issue'],
    title: 'Material Issue Station & Store Dispatch',
    category: 'Inventory & Stores',
    iconName: 'PackageCheck',
    summary: 'Dedicated storekeeper station for issuing raw materials, fasteners, and stock items against active Work Orders with signature verification and inventory deduction.',
    workflowDiagram: {
      title: 'Store Material Requisition Flow',
      subtitle: 'From production requisition to store physical release',
      steps: [
        {
          stepNumber: 1,
          title: 'Work Order Requisition',
          description: 'Work order specifies required raw material dimensions, weights, and quantities.',
          actor: 'Production Planner',
          statusBadge: 'Requested',
          color: 'blue',
          nextSteps: ['Storekeeper Verification']
        },
        {
          stepNumber: 2,
          title: 'Stock Picking & Measurement',
          description: 'Storekeeper identifies stock, cuts rod or plate if needed, and stages material for release.',
          actor: 'Storekeeper',
          statusBadge: 'Staged',
          color: 'amber',
          nextSteps: ['Issue Confirmation']
        },
        {
          stepNumber: 3,
          title: 'Issue Voucher Generation',
          description: 'Material is officially marked as issued. Stock quantities are decremented from inventory ledger.',
          actor: 'Storekeeper & Machinist',
          statusBadge: 'Issued',
          color: 'emerald',
          nextSteps: ['Shop Floor Machining']
        }
      ]
    },
    actions: [
      {
        name: 'Select Work Order',
        badge: 'Search',
        description: 'Choose which active Work Order requires materials.',
        howTo: 'Pick from the dropdown of active production jobs.'
      },
      {
        name: 'Confirm Material Issue',
        badge: 'CheckCircle2',
        description: 'Deducts material from warehouse stock and logs the movement in the audit ledger.',
        howTo: 'Verify quantities and click "Confirm Issue".'
      }
    ],
    tips: [
      'Always verify part numbers and heat numbers before issuing raw stock to critical engineering jobs.'
    ],
    faq: [
      {
        question: 'Can materials be returned to store if unused?',
        answer: 'Yes! You can record a Material Return in the stock adjustments ledger to restore unused raw stock.'
      }
    ],
    relatedModules: [
      { title: 'Inventory Hub', route: '/inventory' },
      { title: 'Work Orders', route: '/production' }
    ]
  },

  // 9. Purchasing & GRN
  {
    id: 'purchasing-hub',
    routePatterns: ['/purchasing', '/purchasing/po-builder', '/purchasing/grn-builder', '/purchasing/bill-builder'],
    title: 'Purchasing, POs, GRN & Supplier Bills',
    category: 'Procurement',
    iconName: 'Truck',
    summary: 'Manages procurement from Material Requisitions (MR), Purchase Orders (PO), Goods Received Notes (GRN) quality inspection, and Supplier Bills settlement.',
    workflowDiagram: {
      title: 'Procure-to-Pay Lifecycle',
      subtitle: 'From material request to supplier payment settlement',
      steps: [
        {
          stepNumber: 1,
          title: 'Purchase Order (PO)',
          description: 'Purchase Order sent to approved supplier with agreed prices, delivery target, and terms.',
          actor: 'Purchasing Officer',
          statusBadge: 'PO Issued',
          color: 'blue',
          nextSteps: ['Goods Received (GRN)']
        },
        {
          stepNumber: 2,
          title: 'Goods Received Note (GRN)',
          description: 'Shipment received at factory gate. Storekeeper inspects quantities and physical condition.',
          actor: 'Store Inspector',
          statusBadge: 'GRN Approved',
          color: 'emerald',
          nextSteps: ['Inventory Auto-Update']
        },
        {
          stepNumber: 3,
          title: 'Supplier Bill Matching',
          description: '3-way matching between Purchase Order, GRN, and Supplier Invoice for exact billing.',
          actor: 'Accounts Payable',
          statusBadge: 'Billed',
          color: 'purple',
          nextSteps: ['Payment Voucher']
        },
        {
          stepNumber: 4,
          title: 'Payment Settlement',
          description: 'Finance releases cheque or bank transfer payment against approved supplier bill.',
          actor: 'Finance Director',
          statusBadge: 'Settled',
          color: 'cyan',
          nextSteps: []
        }
      ]
    },
    actions: [
      {
        name: 'New Purchase Order (PO)',
        badge: 'Plus',
        description: 'Creates a new purchase order with supplier selection and line items.',
        howTo: 'Click "New PO" in the purchasing hub.'
      },
      {
        name: 'Create GRN from PO',
        badge: 'Package',
        description: 'Receives items against an open purchase order and automatically updates inventory stock balance.',
        howTo: 'Click "Receive GRN" on an open PO.'
      }
    ],
    tips: [
      'Approved GRNs instantly update the raw stock balances in the main inventory ledger without manual entry.'
    ],
    faq: [
      {
        question: 'How do I handle partial supplier deliveries?',
        answer: 'You can receive partial quantities in a GRN; the remaining balance stays open on the Purchase Order for subsequent deliveries.'
      }
    ],
    relatedModules: [
      { title: 'Inventory Hub', route: '/inventory' },
      { title: 'Accounts Payable', route: '/finance/payables' }
    ]
  },

  // 10. Leads & CRM Pipeline
  {
    id: 'crm-leads',
    routePatterns: ['/crm/leads', '/leads'],
    title: 'Customer Leads & Sales Opportunities',
    category: 'CRM & Sales',
    iconName: 'TrendingUp',
    summary: 'Tracks incoming business inquiries, contact persons, follow-up calls, lead stages (New, Contacted, Quoted, Won, Lost), and 1-click conversion to official Quotations.',
    workflowDiagram: {
      title: 'Lead Conversion Pipeline',
      subtitle: 'From first customer contact to quotation and deal win',
      steps: [
        {
          stepNumber: 1,
          title: 'Inbound Inquiry',
          description: 'Lead recorded with company name, phone, email, and requirements description.',
          actor: 'Sales Rep',
          statusBadge: 'New',
          color: 'blue',
          nextSteps: ['Initial Follow-up']
        },
        {
          stepNumber: 2,
          title: 'Technical Discussion',
          description: 'Sales engineer contacts client to discuss specifications, drawings, and quantities.',
          actor: 'Sales Engineer',
          statusBadge: 'Qualified',
          color: 'indigo',
          nextSteps: ['Create Quotation']
        },
        {
          stepNumber: 3,
          title: 'Generate Quotation',
          description: '1-click action converts lead directly into an engineering or product quotation.',
          actor: 'Estimator',
          statusBadge: 'Quoted',
          color: 'amber',
          nextSteps: ['Quote Negotiation']
        },
        {
          stepNumber: 4,
          title: 'Deal Won & Customer Account',
          description: 'Quote accepted. Lead converted into permanent registered Customer in database.',
          actor: 'Sales Coordinator',
          statusBadge: 'Won',
          color: 'emerald',
          nextSteps: ['Sales Order', 'Work Order']
        }
      ]
    },
    actions: [
      {
        name: 'New Lead (+)',
        badge: 'Plus',
        description: 'Add a new lead record with contact person, phone, and requirements.',
        howTo: 'Click "New Lead" at top right.'
      },
      {
        name: 'Create Quote for Lead',
        badge: 'FileText',
        description: 'Directly opens Quotation Builder pre-filled with this lead\'s company and contact info.',
        howTo: 'Click "Quote" button on any lead card.'
      }
    ],
    tips: [
      'Use the Kanban view to drag and drop leads across pipeline stages.'
    ],
    faq: [
      {
        question: 'Does creating a quote convert the lead automatically?',
        answer: 'The quotation links directly to the lead record. When the quote is approved and won, the lead stage updates to Won and can be promoted to a full Customer.'
      }
    ],
    relatedModules: [
      { title: 'Quotations', route: '/crm/quotations' },
      { title: 'Customers', route: '/crm/customers' }
    ]
  },

  // 11. Customers Directory
  {
    id: 'crm-customers',
    routePatterns: ['/crm/customers', '/customers'],
    title: 'Customers Directory & Credit Management',
    category: 'CRM & Sales',
    iconName: 'Users',
    summary: 'Comprehensive database of all registered corporate clients and individual buyers, credit limits, outstanding receivables, VAT/SVAT numbers, and complete transaction history.',
    workflowDiagram: {
      title: 'Customer Account Governance',
      subtitle: 'Managing credit limits, accounts, and order histories',
      steps: [
        {
          stepNumber: 1,
          title: 'Customer Onboarding',
          description: 'Company registered with BR number, VAT, SVAT/TIN, billing and delivery addresses.',
          actor: 'Sales / Admin',
          statusBadge: 'Active',
          color: 'blue',
          nextSteps: ['Credit Assessment']
        },
        {
          stepNumber: 2,
          title: 'Credit Limit Authorization',
          description: 'Manager reviews financial history and approves credit limit and payment terms.',
          actor: 'Finance Director',
          statusBadge: 'Approved Limit',
          color: 'emerald',
          nextSteps: ['Transactions']
        },
        {
          stepNumber: 3,
          title: 'Order & Billing Activity',
          description: 'Quotations, Sales Orders, and Invoices automatically update the customer ledger.',
          actor: 'Sales & Accounts',
          statusBadge: 'Ongoing',
          color: 'purple',
          nextSteps: ['Collections']
        }
      ]
    },
    actions: [
      {
        name: 'New Customer',
        badge: 'Plus',
        description: 'Register a new customer account.',
        howTo: 'Click "New Customer" button.'
      },
      {
        name: 'View Customer Profile',
        badge: 'Eye',
        description: 'See full statements, invoices, quotations, credit balance, and contact persons.',
        howTo: 'Click any customer card or name.'
      }
    ],
    tips: [
      'Credit limit warnings show automatically on quotations and sales orders if customer balance exceeds approved limits.'
    ],
    faq: [
      {
        question: 'How do I request a credit limit increase?',
        answer: 'Open the customer profile and submit a Credit Limit Request. It will appear in the Central Approvals Hub for manager authorization.'
      }
    ],
    relatedModules: [
      { title: 'Quotations', route: '/crm/quotations' },
      { title: 'Central Approvals', route: '/admin/approvals' }
    ]
  },

  // 12. General Accounting & Finance
  {
    id: 'finance-accounting',
    routePatterns: ['/finance', '/finance/accounting', '/finance/banking', '/finance/reports'],
    title: 'Finance, Banking & General Accounting',
    category: 'Finance & Accounts',
    iconName: 'DollarSign',
    summary: 'Double-entry bookkeeping, Chart of Accounts, manual journal entries, bank statement feeds, Profit & Loss, Balance Sheet, and tax reporting.',
    workflowDiagram: {
      title: 'Financial Accounting Workflow',
      subtitle: 'From transactions to ledger posting and financial reports',
      steps: [
        {
          stepNumber: 1,
          title: 'Operational Transactions',
          description: 'Sales invoices, supplier bills, and payment receipts post automated journal entries to GL.',
          actor: 'Operational Sub-ledgers',
          statusBadge: 'Posted',
          color: 'blue',
          nextSteps: ['Bank Reconciliation']
        },
        {
          stepNumber: 2,
          title: 'Bank Statement Reconciliation',
          description: 'Bank statements matched against company payment receipts and disbursements.',
          actor: 'Accountant',
          statusBadge: 'Reconciled',
          color: 'emerald',
          nextSteps: ['Month-End Closing']
        },
        {
          stepNumber: 3,
          title: 'Financial Reporting',
          description: 'Automated generation of Trial Balance, Profit & Loss Statement, and Balance Sheet.',
          actor: 'Chief Accountant',
          statusBadge: 'Finalized',
          color: 'purple',
          nextSteps: []
        }
      ]
    },
    actions: [
      {
        name: 'Journal Builder',
        badge: 'Plus',
        description: 'Create multi-line manual debits and credits journal vouchers.',
        howTo: 'Click "New Journal Entry" in the Accounting Hub.'
      },
      {
        name: 'Financial Reports',
        badge: 'BarChart',
        description: 'Generate P&L, Balance Sheet, and Trial Balance with custom date ranges.',
        howTo: 'Navigate to Reports tab.'
      }
    ],
    tips: [
      'All automated invoice and receipt postings maintain debit-credit parity automatically.'
    ],
    faq: [
      {
        question: 'Where can I find the VAT and SSCL report for tax filing?',
        answer: 'Navigate to Finance > Tax Reports to view the exact breakdown of input vs output VAT and SSCL liabilities.'
      }
    ],
    relatedModules: [
      { title: 'Invoices', route: '/finance/invoices' },
      { title: 'Banking Hub', route: '/finance/banking' }
    ]
  }
];

export function getHelpGuideForPath(pathname: string): HelpGuideItem {
  const normalized = pathname.toLowerCase().trim();

  // Try exact or prefix match
  for (const guide of HELP_GUIDES) {
    for (const pattern of guide.routePatterns) {
      if (normalized === pattern.toLowerCase() || normalized.startsWith(pattern.toLowerCase() + '/')) {
        return guide;
      }
    }
  }

  // Default fallback to Quotations / CRM
  return HELP_GUIDES[0];
}

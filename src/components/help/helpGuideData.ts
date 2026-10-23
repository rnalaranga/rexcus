export interface HelpWorkflowStep {
  stepNumber: number;
  title: string;
  description: string;
  actor: string;
  statusBadge?: string;
  color?: string;
  nextSteps?: string[];
}

export interface HelpActionItem {
  name: string;
  badge?: string;
  description: string;
  howTo: string;
  rolesAllowed?: string;
}

export interface HelpHowToStep {
  title: string;
  instructions: string[];
  importantNote?: string;
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
  howToSteps?: HelpHowToStep[];
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
    title: 'Custom Engineering Quotations (BOM & Costing Engine)',
    category: 'CRM & Sales',
    iconName: 'FileText',
    summary: 'The Engineering Quotations module enables estimating and technical sales teams to price complex machining jobs with automated BOM calculations (steel plates, shafts, rods), manual materials, machining labor rates, manager approvals, and downstream production/sales conversion.',
    workflowDiagram: {
      title: 'Engineering Quotation to Production & Delivery Flow',
      subtitle: 'Complete lifecycle from inquiry costing to work order release and billing',
      steps: [
        {
          stepNumber: 1,
          title: 'BOM Costing & Draft Creation',
          description: 'Estimator builds quotation using automated steel plate dimensions, shaft diameters, manual hardware, machine hours, and profit margins.',
          actor: 'Estimator / Sales Engineer',
          statusBadge: 'Draft',
          nextSteps: ['Submit for Manager Approval']
        },
        {
          stepNumber: 2,
          title: 'Manager Approval Review',
          description: 'Quotation is reviewed in Central Approvals Hub for technical feasibility, margins, and customer credit limits.',
          actor: 'Technical Manager / Admin',
          statusBadge: 'Pending Approval',
          nextSteps: ['Approved', 'Rejected (Reason Logged)']
        },
        {
          stepNumber: 3,
          title: 'Official Submission & Acceptance',
          description: 'Official quotation PDF is emailed or presented to the customer. Client approves and confirms the order.',
          actor: 'Client / Sales Rep',
          statusBadge: 'Approved / Sent',
          nextSteps: ['Commercial Sales Order', 'Advance Receipt']
        },
        {
          stepNumber: 4,
          title: 'Commercial Sales Order & Advance Deposit',
          description: 'Official commercial Sales Order is generated with 1 click. Advance payment receipt is issued to customer.',
          actor: 'Sales Coordinator / Finance',
          statusBadge: 'SO Confirmed',
          nextSteps: ['Production Work Order']
        },
        {
          stepNumber: 5,
          title: 'Production Work Order Release',
          description: 'Quotation BOM and machining operations are released directly to the machine shop floor as an active Work Order.',
          actor: 'Production Planner',
          statusBadge: 'In Production',
          nextSteps: ['Material Issue', 'Machining']
        },
        {
          stepNumber: 6,
          title: 'Tax Invoicing & Sample Tracking',
          description: 'Tax Invoice is generated with VAT/SSCL profiles. Customer Sample GRN is printed if physical sample was provided.',
          actor: 'Accounts & Store',
          statusBadge: 'Invoiced',
          nextSteps: ['Final Payment Settlement']
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Start a New Engineering Quote',
        instructions: [
          'Click "+ New Quotation" in the top right header.',
          'Select an existing Customer or Lead, or register a new walk-in customer directly.',
          'The quotation serial number is assigned from the unified sequence (starting at 2206).'
        ],
        importantNote: 'Unified serial numbering ensures no duplicate reference numbers between engineering and product quotes.'
      },
      {
        title: 'Step 2: Add BOM Parts & Material Costing',
        instructions: [
          'Add parts using Automated Materials: enter Steel Plates (Length × Width × Thickness) or Round Shafts (Diameter × Length). The system calculates weights and material costs automatically.',
          'Add Manual Materials (bearings, standard fasteners, bought-out components) with quantities and unit costs.',
          'Add Machining & Labor operations (CNC Milling, Lathe turning, Surface Grinding, Welding) with estimated operational hours.'
        ]
      },
      {
        title: 'Step 3: Margins, Taxes & Approval Submission',
        instructions: [
          'Set overall profit margin (%) and customer discount (percentage or fixed amount).',
          'Toggle Tax Profiles (VAT 18%, SSCL 2.5%) as needed.',
          'Click Save. In the quotation list, click "Actions ▾ > Submit for Approval" so managers can authorize it in the Approvals Hub.'
        ]
      },
      {
        title: 'Step 4: Commercial Execution & Downstream Workflows',
        instructions: [
          'Once Approved, click "Actions ▾ > Create Sales Order" to confirm the commercial order.',
          'Click "Actions ▾ > Issue Advance Receipt" to record down payments and print official cash/bank receipts.',
          'Click "Actions ▾ > Create Work Order" to push the BOM directly to the machine shop floor.',
          'Click "Actions ▾ > Generate Tax Invoice" to bill the customer without re-typing line items.'
        ]
      }
    ],
    actions: [
      {
        name: '+ New Quotation',
        badge: 'Plus',
        description: 'Opens the full Quotation Builder to create a new custom engineering quotation from scratch.',
        howTo: 'Click the primary button "+ New Quotation" at the top right of the page.'
      },
      {
        name: 'Preview (1-Click)',
        badge: 'Eye',
        description: 'Opens a high-fidelity printable quotation view matching Rex Industries official letterhead.',
        howTo: 'Click the "Preview" button on any quotation row. Allows quick printing or PDF export.'
      },
      {
        name: 'Actions ▾ > Preview Document',
        badge: 'Eye',
        description: 'Opens high-fidelity printable quotation view matching official Rex Industries letterhead format.',
        howTo: 'Click Actions ▾ on any quotation row and choose "Preview Document".'
      },
      {
        name: 'Actions ▾ > Edit in Builder',
        badge: 'FileEdit',
        description: 'Opens the quotation in the full Quotation Builder to modify BOMs, plate dimensions, labor rates, and discounts.',
        howTo: 'Click Actions ▾ and choose "Edit in Quotation Builder". Saves new changes as revisions.'
      },
      {
        name: 'Actions ▾ > Send via Email',
        badge: 'Mail',
        description: 'Emails official quotation PDF directly to customer contact with customized cover message.',
        howTo: 'Click Actions ▾ and choose "Send via Email". Enter or confirm customer email address.'
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
        name: 'Actions ▾ > Customer Sample GRN',
        badge: 'Package',
        description: 'Records customer samples received for testing/replication, prints official Customer Sample GRN.',
        howTo: 'Click Actions ▾ > "Receive Sample (GRN)" or "Print Sample GRN".'
      },
      {
        name: 'Actions ▾ > View Costing & Dimensions',
        badge: 'Briefcase',
        description: 'Quickly inspect raw material dimensions, weights, unit costs, and planned machining hours without entering full edit mode.',
        howTo: 'Click Actions ▾ > "View Costing & Dimensions".'
      },
      {
        name: 'Actions ▾ > Submit for Approval',
        badge: 'Send',
        description: 'Submits draft quotation to manager workflow in Central Approvals Hub.',
        howTo: 'Click Actions ▾ > "Submit for Approval".'
      },
      {
        name: 'Actions ▾ > Approve / Reject',
        badge: 'CheckCircle',
        description: 'Managers can approve or reject the quotation directly from the row without navigating to Approvals Hub.',
        howTo: 'Available for users with approvals permission. Click Actions ▾ > "Approve Quotation" or "Reject Quotation".'
      },
      {
        name: 'Actions ▾ > Delete Quotation Group',
        badge: 'Trash2',
        description: 'Permanently deletes all versions and sub-quotes associated with this quotation group.',
        howTo: 'Click Actions ▾ > "Delete Quotation Group" and confirm.'
      },
      {
        name: 'Revisions Toggle ({count} revs ▾)',
        badge: 'History',
        description: 'Toggles a compact history panel showing all previous versions (v1, v2, v3) of this quotation with individual view/edit/delete options.',
        howTo: 'Click the revisions pill in the quotation row.'
      },
      {
        name: 'Filter Tabs (All, Draft, Pending, Approved, Sent, In Production)',
        badge: 'Filter',
        description: 'Filters quotation list by operational workflow state.',
        howTo: 'Click any status tab above the table.'
      }
    ],
    tips: [
      'To combine multiple quotes into one final client quote, check the boxes next to the quote numbers and click "Make Final Quote" at the top.',
      'Quotations must be Approved before changing status to Sent or In Production.',
      'Use the quick date range buttons ("This Month", "Last 30 Days") in the filter bar to isolate recent activity.',
      'BOM costing can be inspected anytime by clicking "Costing" under the quoted item description.'
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
          nextSteps: ['Submit for Approval']
        },
        {
          stepNumber: 2,
          title: 'Approval Check',
          description: 'Manager validates customer creditworthiness, discount percentages, and availability.',
          actor: 'Manager',
          statusBadge: 'Pending Approval',
          nextSteps: ['Approved']
        },
        {
          stepNumber: 3,
          title: 'Commercial Sales Order',
          description: '1-click conversion to Commercial Sales Order with stock reservation from finished goods warehouse.',
          actor: 'Sales Coordinator',
          statusBadge: 'SO Created',
          nextSteps: ['Advance Receipt', 'Dispatch']
        },
        {
          stepNumber: 4,
          title: 'Dispatch & Invoicing',
          description: 'Goods are packaged, Gate Pass is generated, and Tax Invoice is issued to customer.',
          actor: 'Store & Accounts',
          statusBadge: 'Invoiced / Dispatched',
          nextSteps: ['Settlement']
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Start a Product Quotation',
        instructions: [
          'Click "+ New Product Quote" at top right.',
          'Choose an existing customer or lead from the autocomplete dropdown.',
          'Quotation serial number is unified with engineering quotes (starting at 2206).'
        ]
      },
      {
        title: 'Step 2: Add Finished Goods Items',
        instructions: [
          'Select stocked product lines from the finished goods inventory or type custom product descriptions.',
          'Enter quantities, unit selling prices, and apply item-level or total commercial discounts.',
          'Assign tax profiles (VAT/SSCL) and select the company bank account for wire transfers.'
        ]
      },
      {
        title: 'Step 3: Manager Sign-off & Client Email',
        instructions: [
          'Submit the quotation for approval if discounts or values require manager sign-off.',
          'Once approved, click "Actions ▾ > Send via Email" to send the official quote directly to the client with PDF attachment.'
        ]
      },
      {
        title: 'Step 4: Sales Order & Invoice Conversion',
        instructions: [
          'Click "Actions ▾ > Create Sales Order" to convert the approved quote into a commercial order with warehouse stock reservation.',
          'Issue customer advance payment receipts via "Actions ▾ > Issue Advance Receipt".',
          'Click "Actions ▾ > Generate Tax Invoice" to issue the final commercial tax invoice.'
        ]
      }
    ],
    actions: [
      {
        name: '+ New Product Quote',
        badge: 'Plus',
        description: 'Creates a new finished goods catalog quotation.',
        howTo: 'Click "+ New Product Quote" at the top right.'
      },
      {
        name: 'Preview Document',
        badge: 'Eye',
        description: 'View full formatted quotation document with Rex header, item specifications, and terms.',
        howTo: 'Click Actions ▾ on any row and choose "Preview Document".'
      },
      {
        name: 'Actions ▾ > Edit in Quotation Builder',
        badge: 'Edit3',
        description: 'Opens the product quotation builder to edit line items, prices, discounts, or bank details.',
        howTo: 'Click Actions ▾ and click "Edit in Quotation Builder".'
      },
      {
        name: 'Actions ▾ > Send via Email',
        badge: 'Mail',
        description: 'Sends the quote directly to the customer email address with PDF attachment.',
        howTo: 'Click Actions ▾ and choose "Send via Email".'
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
      },
      {
        name: 'Actions ▾ > Submit for Approval / Approve / Reject',
        badge: 'CheckCircle2',
        description: 'Controls the manager sign-off workflow for catalog quotations.',
        howTo: 'Click Actions ▾ and select appropriate approval action.'
      },
      {
        name: 'Actions ▾ > Delete Quotation',
        badge: 'Trash2',
        description: 'Deletes quotation record from system.',
        howTo: 'Click Actions ▾ > "Delete Quotation".'
      }
    ],
    tips: [
      'Product quotations allow direct lookup from inventory stock items with real-time stock availability indicators.',
      'Click the revisions button to inspect price changes between quotation versions.',
      'In the "All" view, all real quotations are displayed while unfinished drafts are shown when filtering by customer.'
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
          nextSteps: ['Stock Availability Check']
        },
        {
          stepNumber: 2,
          title: 'Stock Allocation / Work Order',
          description: 'System checks warehouse stock. If shortage exists, a Production Work Order is created with 1 click.',
          actor: 'Storekeeper / Production',
          statusBadge: 'In Stock / Production',
          nextSteps: ['Advance Payment Receipt']
        },
        {
          stepNumber: 3,
          title: 'Advance Payment Receipt',
          description: 'Customer advance is collected and official receipt is issued.',
          actor: 'Cashier / Finance',
          statusBadge: 'Advance Received',
          nextSteps: ['Invoice Generation']
        },
        {
          stepNumber: 4,
          title: 'Tax Invoice & Dispatch',
          description: 'Tax Invoice generated. Storekeeper fills driver & vehicle details to print the official Gate Pass.',
          actor: 'Store & Security',
          statusBadge: 'Dispatched',
          nextSteps: ['Delivered']
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Order Generation & Confirmation',
        instructions: [
          'Sales orders are automatically generated from Approved Quotations with 1 click, or created directly via "+ New Sales Order".',
          'Review customer details, billing/shipping addresses, line items, and delivery deadlines.'
        ]
      },
      {
        title: 'Step 2: Warehouse Stock Check & Shortage Work Orders',
        instructions: [
          'Examine the "Stock Check" column on each line item.',
          'If items are in stock, they are allocated for delivery.',
          'If a shortage exists (amber badge), click "Actions ▾ > Create Work Order" to manufacture the required quantities immediately.'
        ]
      },
      {
        title: 'Step 3: Advance Receipts & Billing',
        instructions: [
          'Collect customer advance payments and click "Actions ▾ > Issue Advance Receipt" to generate an official numbered receipt.',
          'Click "Actions ▾ > Generate Invoice" to create a tax invoice linked to the order.'
        ]
      },
      {
        title: 'Step 4: Dispatch & Factory Gate Pass',
        instructions: [
          'When goods are ready for dispatch, click "Actions ▾ > Dispatch & Gate Pass".',
          'Enter carrier type, vehicle registration number, driver name, and phone number.',
          'System generates and prints the official factory Gate Pass (GP-xxxx) required by security.'
        ]
      }
    ],
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
          nextSteps: ['Manager Review']
        },
        {
          stepNumber: 2,
          title: 'Manager Evaluation',
          description: 'Manager inspects quote details, margins, customer outstanding balances, and terms.',
          actor: 'Manager / Director',
          statusBadge: 'In Review',
          nextSteps: ['Approve / Reject Decision']
        },
        {
          stepNumber: 3,
          title: 'Decision & Audit Logging',
          description: 'Manager clicks Approve or Reject. Rejections require mandatory reason. Decision logged to database audit trail.',
          actor: 'Manager & System',
          statusBadge: 'Approved / Rejected',
          nextSteps: ['Status updated in CRM', 'History Log created']
        },
        {
          stepNumber: 4,
          title: 'Historical Audit Trail',
          description: 'All past decisions, approver names, reasons, and timestamps remain accessible in the History Log tab.',
          actor: 'Auditor / Compliance',
          statusBadge: 'Logged',
          nextSteps: []
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Inspect Pending Approvals',
        instructions: [
          'Open the Central Approvals Hub from the sidebar or notifications.',
          'View pending engineering and product quotations in the "Quotation Approvals" tab.',
          'Check customer credit limit extension requests in the "Credit Limit Requests" tab.'
        ]
      },
      {
        title: 'Step 2: Technical & Financial Evaluation',
        instructions: [
          'Review quoted amounts, discounts, payment terms, and profit margins.',
          'Check customer outstanding receivables and credit history.'
        ]
      },
      {
        title: 'Step 3: Approve or Reject with Audit Logging',
        instructions: [
          'Click "Approve" (check icon) to immediately authorize the quotation or credit limit.',
          'Click "Reject" (cross icon) and enter a mandatory revision reason so the estimator can correct the quotation.',
          'Every decision is permanently recorded in the immutable database audit trail.'
        ]
      },
      {
        title: 'Step 4: Auditing History',
        instructions: [
          'Switch to "Approval History Log" tab to view all past approved and rejected requests with approver names, timestamps, and logged reasons.'
        ]
      }
    ],
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
          nextSteps: ['Material Issue Station']
        },
        {
          stepNumber: 2,
          title: 'Material Issue & Cutting',
          description: 'Store releases specified raw steel plates, rods, and hardware to the machining department.',
          actor: 'Storekeeper',
          statusBadge: 'Materials Issued',
          nextSteps: ['Machining Operations']
        },
        {
          stepNumber: 3,
          title: 'Machining & Fabrication',
          description: 'Operators perform Turning, Milling, Boring, Welding, Grinding with logged machine hours.',
          actor: 'Machinists / Operators',
          statusBadge: 'In Progress',
          nextSteps: ['Quality Inspection']
        },
        {
          stepNumber: 4,
          title: 'Quality Check & Finish',
          description: 'Final dimensions inspected against technical drawings. Work order marked Completed.',
          actor: 'QC Inspector',
          statusBadge: 'Completed',
          nextSteps: ['Finished Goods Warehouse']
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Work Order Creation & Release',
        instructions: [
          'Generated automatically from Approved Quotations or created directly via "+ New Work Order".',
          'Review customer name, target delivery date, job priority, and item quantities.'
        ]
      },
      {
        title: 'Step 2: Material Requisition & Issue',
        instructions: [
          'Check BOM materials (plates, shafts, bought-out components).',
          'Click "Issue Materials" to deduct raw materials from warehouse inventory and generate a Material Issue Note (MIN).'
        ]
      },
      {
        title: 'Step 3: Machine Shop Floor Operations',
        instructions: [
          'Operators record labor and machine hours spent on CNC Milling, Lathe turning, Boring, Heat Treatment, and Grinding.',
          'Update progress percentage (e.g. 25%, 50%, 75%, 100%).'
        ]
      },
      {
        title: 'Step 4: Quality Inspection & Finished Goods Transfer',
        instructions: [
          'Quality control inspector checks part dimensions against blueprint tolerances.',
          'Mark order as Completed to transfer finished parts into Finished Goods inventory or prepare for dispatch.'
        ]
      }
    ],
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
          nextSteps: ['Tax Profile Selection']
        },
        {
          stepNumber: 2,
          title: 'Tax & Discount Calculation',
          description: 'Standard VAT, SSCL, and withholding taxes computed automatically according to tax profile.',
          actor: 'Billing System',
          statusBadge: 'Calculated',
          nextSteps: ['Issue Official Invoice']
        },
        {
          stepNumber: 3,
          title: 'Invoice Issuance & Dispatch',
          description: 'Official invoice number assigned. PDF printed or emailed directly to client.',
          actor: 'Accountant',
          statusBadge: 'Sent / Unpaid',
          nextSteps: ['Payment Collection']
        },
        {
          stepNumber: 4,
          title: 'Payment Settlement',
          description: 'Customer payment recorded (cash, cheque, bank transfer). Invoice marked Paid or Partially Paid.',
          actor: 'Accounts Receivable',
          statusBadge: 'Paid',
          nextSteps: ['General Ledger Posting']
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Create Tax Invoice',
        instructions: [
          'Click "+ New Invoice" or click "Generate Tax Invoice" directly from an Approved Quotation or Sales Order.',
          'Customer details, contact info, and tax numbers (VAT/SVAT) are pre-populated.'
        ]
      },
      {
        title: 'Step 2: Line Items, Taxes & SSCL',
        instructions: [
          'Add or verify billed line items, quantities, and rates.',
          'Apply tax profiles: VAT (18%) and SSCL (2.5%) are computed according to official Sri Lankan Inland Revenue formulas.',
          'Deduct customer discounts if applicable.'
        ]
      },
      {
        title: 'Step 3: Printing & Official Dispatch',
        instructions: [
          'Click "Preview" or "Print" to export official Rex Industries Tax Invoice on letterhead.',
          'Email invoice PDF directly to customer accounting contacts.'
        ]
      },
      {
        title: 'Step 4: Payment Application & Receipts',
        instructions: [
          'Apply advance payments already collected, or record new customer payments (Cash, Bank Transfer, Cheque).',
          'Track invoice status: Draft ➔ Issued ➔ Partially Paid ➔ Paid / Overdue.'
        ]
      }
    ],
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
        answer: 'No. The invoice page loads smoothly and directly without any disruptive browser popups or prompts.'
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
    title: 'Raw Materials & Inventory Management',
    category: 'Inventory & Warehousing',
    iconName: 'Boxes',
    summary: 'Real-time stock valuation, raw steel stock (plates, rods, hex bars), bought-out components, finished goods, reorder level alerts, and stock adjustments.',
    workflowDiagram: {
      title: 'Inventory Movement Cycle',
      subtitle: 'From supplier procurement to shop floor issue and stock reconciliation',
      steps: [
        {
          stepNumber: 1,
          title: 'Stock Receipt (GRN)',
          description: 'Materials received from suppliers inspected and entered into warehouse stock via Supplier GRN.',
          actor: 'Storekeeper',
          statusBadge: 'Received',
          nextSteps: ['Warehouse Binning']
        },
        {
          stepNumber: 2,
          title: 'Stock Allocation',
          description: 'Stock allocated for production work orders or customer sales orders.',
          actor: 'Inventory Controller',
          statusBadge: 'Allocated',
          nextSteps: ['Material Issue']
        },
        {
          stepNumber: 3,
          title: 'Material Issue Note (MIN)',
          description: 'Materials issued to machinists. Warehouse balances automatically reduced.',
          actor: 'Storekeeper',
          statusBadge: 'Issued',
          nextSteps: ['Finished Goods Receipt']
        },
        {
          stepNumber: 4,
          title: 'Stock Audits & Valuation',
          description: 'Periodic physical stock counts matched against system balances. Discrepancies logged as adjustments.',
          actor: 'Internal Auditor',
          statusBadge: 'Verified',
          nextSteps: []
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Adding & Managing Stock Items',
        instructions: [
          'Click "+ Add Item" to register raw material grades (MS, SS304, EN8, Brass) or finished products.',
          'Define SKUs, category, unit of measure (kg, pcs, meters, plates), and reorder warning levels.'
        ]
      },
      {
        title: 'Step 2: Tracking In & Out Movements',
        instructions: [
          'Inspect the real-time stock ledger to see incoming supplier deliveries (GRN) and outgoing production issues (MIN).',
          'Items falling below minimum reorder thresholds trigger amber warning badges automatically.'
        ]
      },
      {
        title: 'Step 3: Stock Adjustments & Physical Audits',
        instructions: [
          'If physical counts differ from system quantities, click "Adjust Stock" and enter reconciliation reason.',
          'Audit log records all adjustments with user name and timestamp.'
        ]
      }
    ],
    actions: [
      {
        name: 'Add Item',
        badge: 'Plus',
        description: 'Registers a new raw material, tool, or finished product SKU.',
        howTo: 'Click "+ Add Item" at the top right.'
      },
      {
        name: 'Linear Cut Studio',
        badge: 'Ruler',
        description: 'Optimizes plate and bar cut plans to minimize steel scrap and wastage.',
        howTo: 'Click "Linear Stock Cut Studio" button in toolbar.'
      },
      {
        name: 'Stock Ledger',
        badge: 'List',
        description: 'View full audit log of transactions (IN, OUT, ADJUST) for any inventory item.',
        howTo: 'Click "View Ledger" on any item card.'
      }
    ],
    tips: [
      'Set reorder levels accurately so the system warns you well before critical steel grades run out during production.',
      'Check the Linear Cut Studio to optimize rod cutting before issuing full bars to operators.'
    ],
    faq: [
      {
        question: 'How do I adjust stock for damaged or scrapped materials?',
        answer: 'Open the item detail modal and click "Adjust Stock". Select "Scrap/Loss" and enter the quantity to deduct.'
      }
    ],
    relatedModules: [
      { title: 'Material Issue Station', route: '/inventory/material-issue' },
      { title: 'Purchasing Hub', route: '/purchasing' }
    ]
  },

  // 8. Material Issue (MIN)
  {
    id: 'inventory-material-issue',
    routePatterns: ['/inventory/material-issue'],
    title: 'Material Issue Station (MIN Dispatch)',
    category: 'Inventory & Warehousing',
    iconName: 'Package',
    summary: 'The Material Issue Station controls raw material dispatches to the machine shop floor against specific work orders, generating official Material Issue Notes (MIN) and updating inventory balances in real-time.',
    workflowDiagram: {
      title: 'Material Requisition & Issue Flow',
      subtitle: 'From shop floor request to warehouse issue and MIN printing',
      steps: [
        {
          stepNumber: 1,
          title: 'Work Order Selection',
          description: 'Storekeeper selects an active Work Order requiring raw steel, fasteners, or tooling.',
          actor: 'Storekeeper',
          statusBadge: 'Request Pending',
          nextSteps: ['Stock Availability Check']
        },
        {
          stepNumber: 2,
          title: 'Verify Stock & Cut Off',
          description: 'Storekeeper measures and cuts the required plates, rods, or takes components from warehouse bins.',
          actor: 'Store Assistant',
          statusBadge: 'Preparing',
          nextSteps: ['Issue Confirmation']
        },
        {
          stepNumber: 3,
          title: 'Generate & Print MIN',
          description: 'Official Material Issue Note (MIN-xxxx) is generated and printed. Signed by storekeeper and machine operator.',
          actor: 'Storekeeper & Operator',
          statusBadge: 'Issued',
          nextSteps: ['Machining Job Started']
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Select Work Order',
        instructions: [
          'Pick the active Work Order from the dropdown or search list.',
          'Review the BOM requirements and items requested by the engineering team.'
        ]
      },
      {
        title: 'Step 2: Confirm Quantities & Batches',
        instructions: [
          'Verify available physical stock in the store.',
          'Enter the exact quantity, weight, or dimensions being issued to the machinist.'
        ]
      },
      {
        title: 'Step 3: Issue and Print MIN',
        instructions: [
          'Click "Confirm Material Issue". System deducts quantities from raw stock.',
          'Print the Material Issue Note (MIN) for operator and gate signatures.'
        ]
      }
    ],
    actions: [
      {
        name: 'Issue Material Note',
        badge: 'FileText',
        description: 'Records material issuance against a work order and prints the MIN.',
        howTo: 'Select work order, click Issue Materials.'
      },
      {
        name: 'Print MIN',
        badge: 'Printer',
        description: 'Prints official store dispatch slip for shop floor records.',
        howTo: 'Click "Print MIN" on past issue logs.'
      }
    ],
    tips: [
      'Always have the operator sign the printed MIN slip to maintain physical audit accountability.'
    ],
    faq: [
      {
        question: 'Can I issue materials partially if full quantity is not in stock?',
        answer: 'Yes. You can issue available quantities now and record a second MIN later when remaining stock arrives.'
      }
    ],
    relatedModules: [
      { title: 'Work Orders', route: '/production' },
      { title: 'Inventory Stock', route: '/inventory' }
    ]
  },

  // 9. Purchasing Hub
  {
    id: 'purchasing-hub',
    routePatterns: ['/purchasing', '/purchasing/hub'],
    title: 'Purchasing, Requisitions & Supplier GRN',
    category: 'Procurement',
    iconName: 'Truck',
    summary: 'Manages internal Material Requisitions (MR), official Purchase Orders (PO) to vendors, Supplier Goods Received Notes (GRN), and supplier bill tracking.',
    workflowDiagram: {
      title: 'Procurement to Payment Cycle',
      subtitle: 'From internal material need to supplier invoice settlement',
      steps: [
        {
          stepNumber: 1,
          title: 'Material Requisition (MR)',
          description: 'Department heads request materials needed for jobs or reorder replenishment.',
          actor: 'Requesting Dept',
          statusBadge: 'MR Created',
          nextSteps: ['PO Generation']
        },
        {
          stepNumber: 2,
          title: 'Purchase Order (PO)',
          description: 'Official PO issued to approved supplier with agreed prices, delivery terms, and payment terms.',
          actor: 'Purchasing Officer',
          statusBadge: 'PO Issued',
          nextSteps: ['Supplier Delivery']
        },
        {
          stepNumber: 3,
          title: 'Goods Received Note (GRN)',
          description: 'Warehouse receives, counts, and inspects materials against supplier delivery order. GRN increments raw stock.',
          actor: 'Storekeeper / Gate',
          statusBadge: 'GRN Approved',
          nextSteps: ['Supplier Bill']
        },
        {
          stepNumber: 4,
          title: 'Supplier Bill & Payment',
          description: 'Accounts 3-way matches PO, GRN, and Supplier Invoice before payment release.',
          actor: 'Accounts Payable',
          statusBadge: 'Settled',
          nextSteps: []
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Create Purchase Order (PO)',
        instructions: [
          'Click "+ New Purchase Order" in the Purchasing Hub.',
          'Select supplier from approved vendor list. Add steel grades, plates, or tooling items with quantities and agreed unit costs.'
        ]
      },
      {
        title: 'Step 2: Send PO to Supplier',
        instructions: [
          'Export PO as official PDF with Rex Industries letterhead and email to vendor sales representative.'
        ]
      },
      {
        title: 'Step 3: Receive Materials (GRN)',
        instructions: [
          'When the delivery truck arrives, open the PO and click "Receive Goods (GRN)".',
          'Verify delivered quantities and test certificates. System automatically adds items into raw materials inventory.'
        ]
      }
    ],
    actions: [
      {
        name: 'New PO (+)',
        badge: 'Plus',
        description: 'Creates a purchase order for suppliers.',
        howTo: 'Click "+ New PO" button in top toolbar.'
      },
      {
        name: 'Create GRN',
        badge: 'Package',
        description: 'Receives materials from supplier delivery into inventory.',
        howTo: 'Click "Receive GRN" on pending PO.'
      }
    ],
    tips: [
      'Always enter the supplier delivery invoice number on the GRN to simplify accounting 3-way matching.'
    ],
    faq: [
      {
        question: 'What happens when a supplier delivers partial items?',
        answer: 'You can record a partial GRN. The PO will remain in "Partially Received" status until the remaining balance arrives.'
      }
    ],
    relatedModules: [
      { title: 'Inventory Stock', route: '/inventory' },
      { title: 'Accounting Hub', route: '/finance/accounting' }
    ]
  },

  // 10. Leads CRM
  {
    id: 'crm-leads',
    routePatterns: ['/crm/leads', '/leads'],
    title: 'Leads & Sales Pipeline CRM',
    category: 'CRM & Sales',
    iconName: 'Compass',
    summary: 'Track customer inquiries, sample collections (GRN), lead qualification, drag-and-drop Kanban pipeline progression, and instant quotation creation.',
    workflowDiagram: {
      title: 'Lead Conversion Pipeline',
      subtitle: 'From raw customer inquiry to qualified quote and customer creation',
      steps: [
        {
          stepNumber: 1,
          title: 'Lead Capture',
          description: 'Record inquiry from phone, walk-in, website, or email with contact info and estimated project value.',
          actor: 'Sales Rep',
          statusBadge: 'New',
          nextSteps: ['Contacted']
        },
        {
          stepNumber: 2,
          title: 'Contact & Qualification',
          description: 'Sales engineer contacts client to understand technical drawings, physical sample requirements, and delivery dates.',
          actor: 'Sales Engineer',
          statusBadge: 'Contacted ➔ Qualified',
          nextSteps: ['Sample Collection', 'Quotation']
        },
        {
          stepNumber: 3,
          title: 'Sample Collection (GRN)',
          description: 'Client provides physical part/sample for measurement, reverse engineering, or testing. Sample GRN recorded.',
          actor: 'Estimator / Store',
          statusBadge: 'Sample Received',
          nextSteps: ['Quotation Proposal']
        },
        {
          stepNumber: 4,
          title: 'Quotation & Win',
          description: '1-click Quote button opens Quotation Builder. Lead marked Won upon quotation approval and customer sign-off.',
          actor: 'Sales Rep & Client',
          statusBadge: 'Proposal ➔ Won',
          nextSteps: ['Sales Order & Production']
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Register New Sales Leads',
        instructions: [
          'Click "+ Add Lead" in the top header.',
          'Choose an existing customer or toggle "+ Register New Customer" with company name, email, phone, and BR/VAT details.',
          'Assign expected deal value, initial priority (Urgent, High, Medium, Low), and sales owner.'
        ]
      },
      {
        title: 'Step 2: Move Leads through Pipeline Stages',
        instructions: [
          'In Kanban View, drag and drop lead cards between stages: New ➔ Contacted ➔ Qualified ➔ Proposal ➔ Negotiation ➔ Won / Lost.',
          'Track idle days (idle alert badges appear on leads without updates for 7+ days).'
        ]
      },
      {
        title: 'Step 3: Sample Collection & Instant Quoting',
        instructions: [
          'Click "Sample" on any lead card to record a Customer Sample GRN when the client provides a physical part for measurement/copying.',
          'Once a lead reaches "Qualified" stage, click "Quote" directly on the card to open the Quotation Builder with pre-filled customer details.'
        ]
      },
      {
        title: 'Step 4: Managing High-Volume Leads',
        instructions: [
          'The system displays the latest 20 leads by default to keep the interface fast and responsive.',
          'Click "Load Next +20 Leads" or "See All ({total})" in Table view, or "+X more in {stage}" in Kanban columns to browse older leads.',
          'Use filter pills (Hot Leads, Needs Followup, Won, Lost) to instantly isolate critical deals.'
        ]
      }
    ],
    actions: [
      {
        name: '+ Add Lead',
        badge: 'Plus',
        description: 'Creates a new lead record with customer selection or on-the-fly registration.',
        howTo: 'Click "+ Add Lead" in top right.'
      },
      {
        name: 'Kanban vs Table View',
        badge: 'LayoutGrid',
        description: 'Toggle between visual drag-and-drop pipeline stages and dense data table view.',
        howTo: 'Click layout toggle icons in toolbar.'
      },
      {
        name: 'Sample Button on Card',
        badge: 'Package',
        description: 'Opens Customer Sample GRN modal directly from lead card.',
        howTo: 'Click "Sample" button on any kanban card.'
      },
      {
        name: 'Quote Button on Card',
        badge: 'FileText',
        description: 'Immediately opens Quotation Builder with customer pre-loaded once lead is qualified.',
        howTo: 'Click "Quote" button on cards in Qualified stage.'
      },
      {
        name: 'Latest 20 vs See All Toggle',
        badge: 'List',
        description: 'Controls initial display limit for high performance with 1-click access to all records.',
        howTo: 'Click "Latest 20" or "See All ({total})" toggle in toolbar.'
      }
    ],
    tips: [
      'Leads idle for more than 7 days automatically highlight in amber to prompt quick sales followup.',
      'Always convert qualified leads into formal quotes to establish official audit pricing.'
    ],
    faq: [
      {
        question: 'How do I register a walk-in client without creating a customer first?',
        answer: 'In the Add Lead modal, click "+ Register New Customer". It will create both the customer master record and the active lead in one step.'
      }
    ],
    relatedModules: [
      { title: 'Quotations', route: '/crm/quotations' },
      { title: 'Customers', route: '/crm/customers' }
    ]
  },

  // 11. Customers Hub
  {
    id: 'crm-customers',
    routePatterns: ['/crm/customers', '/customers'],
    title: 'Customer Master & Accounts Hub',
    category: 'CRM & Sales',
    iconName: 'Users',
    summary: 'Master database of corporate and individual clients, credit limits, tax numbers (VAT/SVAT/TIN), historical transaction ledgers, and contact persons.',
    workflowDiagram: {
      title: 'Customer Relationship Lifecycle',
      subtitle: 'From registration to credit governance and transaction history',
      steps: [
        {
          stepNumber: 1,
          title: 'Customer Onboarding',
          description: 'Company registered with BR, VAT/SVAT certificate details, finance contact info, and delivery addresses.',
          actor: 'CRM Admin',
          statusBadge: 'Active',
          nextSteps: ['Credit Assessment']
        },
        {
          stepNumber: 2,
          title: 'Credit Limit Governance',
          description: 'Initial credit limit assigned. Increases must be approved by Manager in Central Approvals Hub.',
          actor: 'Finance Manager',
          statusBadge: 'Credit Approved',
          nextSteps: ['Commercial Quoting']
        },
        {
          stepNumber: 3,
          title: 'Transactions & Statements',
          description: 'Full history of quotations, sales orders, invoices, and payment receipts compiled into customer statement.',
          actor: 'Accounts Receivable',
          statusBadge: 'Good Standing',
          nextSteps: []
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Adding a Customer',
        instructions: [
          'Click "+ New Customer" at top right.',
          'Fill Company Name, Business Registration (BR) number, VAT and SVAT numbers.',
          'Add primary contact person, email, and finance phone number.'
        ]
      },
      {
        title: 'Step 2: Managing Credit Limits',
        instructions: [
          'Set maximum allowable outstanding balance.',
          'If client requests credit increase, submit request to Central Approvals Hub.'
        ]
      },
      {
        title: 'Step 3: Inspecting Customer Statement',
        instructions: [
          'Click any customer row to inspect customer profile, past invoices, quotes, and payment receipts.'
        ]
      }
    ],
    actions: [
      {
        name: 'New Customer (+)',
        badge: 'Plus',
        description: 'Creates a new client master account.',
        howTo: 'Click "+ New Customer" button in header.'
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
          nextSteps: ['Bank Reconciliation']
        },
        {
          stepNumber: 2,
          title: 'Bank Statement Reconciliation',
          description: 'Bank statements matched against company payment receipts and disbursements.',
          actor: 'Accountant',
          statusBadge: 'Reconciled',
          nextSteps: ['Month-End Closing']
        },
        {
          stepNumber: 3,
          title: 'Financial Reporting',
          description: 'Automated generation of Trial Balance, Profit & Loss Statement, and Balance Sheet.',
          actor: 'Chief Accountant',
          statusBadge: 'Finalized',
          nextSteps: []
        }
      ]
    },
    howToSteps: [
      {
        title: 'Step 1: Chart of Accounts & GL Setup',
        instructions: [
          'Review the Standard Chart of Accounts (Assets, Liabilities, Equity, Revenue, Cost of Goods, Expenses).',
          'Link company bank accounts (HNB, Commercial Bank, Sampath) to their corresponding ledger accounts.'
        ]
      },
      {
        title: 'Step 2: Posting Journal Vouchers',
        instructions: [
          'Click "New Journal Entry" for manual adjustments, depreciation, or accruals.',
          'Ensure debits equal credits before saving.'
        ]
      },
      {
        title: 'Step 3: Generating Financial Reports',
        instructions: [
          'Select custom date ranges to run the Profit & Loss statement, Balance Sheet, and Trial Balance.',
          'Export reports to PDF or Excel for management reviews.'
        ]
      }
    ],
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

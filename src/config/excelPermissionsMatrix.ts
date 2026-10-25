/**
 * Rex Industries ERP — Excel-Based Roles & Permissions Matrix
 * Standardized across Sales, Stores, Design, and Finance departments.
 */

export type ExcelAction = 'add' | 'edit' | 'view' | 'cancel' | 'delete' | 'approved';

export interface ExcelEntityConfig {
  id: string;
  name: string;
  department: 'sales' | 'stores' | 'design' | 'finance';
  category?: string;
  permissionMap: Partial<Record<ExcelAction, string[]>>;
}

export interface ExcelDepartmentConfig {
  id: 'sales' | 'stores' | 'design' | 'finance';
  title: string;
  badgeColor: string;
  entities: ExcelEntityConfig[];
}

export const EXCEL_DEPARTMENTS: ExcelDepartmentConfig[] = [
  // ── 1. SALES DEPARTMENT ──────────────────────────────────────────────────
  {
    id: 'sales',
    title: 'Sales & CRM Department',
    badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
    entities: [
      {
        id: 'leads',
        name: 'Leads',
        department: 'sales',
        permissionMap: {
          add: ['crm.leads.create', 'crm.leads.manage'],
          edit: ['crm.leads.edit', 'crm.leads.manage'],
          view: ['crm.leads.view', 'crm.leads.manage'],
          cancel: ['crm.leads.manage'],
          delete: ['crm.leads.delete'],
          approved: ['crm.leads.manage']
        }
      },
      {
        id: 'customer_registration',
        name: 'Customer Registration',
        department: 'sales',
        permissionMap: {
          add: ['crm.customers.create'],
          edit: ['crm.customers.edit'],
          view: ['crm.customers.view'],
          cancel: ['crm.customers.edit'],
          delete: ['crm.customers.delete'],
          approved: ['crm.customers.edit', 'approvals.credit_limit']
        }
      },
      {
        id: 'sample_grn',
        name: 'Sample GRN',
        department: 'sales',
        permissionMap: {
          add: ['inventory.customer_grn.manage', 'inventory.customer_grn.create'],
          edit: ['inventory.customer_grn.manage', 'inventory.customer_grn.edit'],
          view: ['inventory.customer_grn.manage', 'inventory.customer_grn.view'],
          cancel: ['inventory.customer_grn.manage'],
          delete: ['inventory.customer_grn.manage'],
          approved: ['inventory.customer_grn.manage']
        }
      },
      {
        id: 'services_quotation',
        name: 'Services Quotation',
        department: 'sales',
        permissionMap: {
          add: ['quotations.create', 'quotations.view_all'],
          edit: ['quotations.edit'],
          view: ['quotations.view', 'quotations.view_all'],
          cancel: ['quotations.delete'],
          delete: ['quotations.delete'],
          approved: ['approvals.quotations', 'quotations.approve']
        }
      },
      {
        id: 'product_quotation',
        name: 'Product Quotation',
        department: 'sales',
        permissionMap: {
          add: ['quotations.create', 'quotations.view_all'],
          edit: ['quotations.edit'],
          view: ['quotations.view', 'quotations.view_all'],
          cancel: ['quotations.delete'],
          delete: ['quotations.delete'],
          approved: ['approvals.quotations', 'quotations.approve']
        }
      },
      {
        id: 'sales_order',
        name: 'Sales Order',
        department: 'sales',
        permissionMap: {
          add: ['production.work_orders.create', 'inventory.items.view'],
          edit: ['production.work_orders.edit'],
          view: ['production.work_orders.view', 'inventory.items.view'],
          cancel: ['production.work_orders.delete'],
          delete: ['production.work_orders.delete'],
          approved: ['approvals.work_orders']
        }
      },
      {
        id: 'bom',
        name: 'BOM',
        department: 'sales',
        permissionMap: {
          add: ['production.work_orders.create', 'production.operations.manage'],
          edit: ['production.work_orders.edit'],
          view: ['production.work_orders.view'],
          cancel: ['production.work_orders.delete'],
          delete: ['production.work_orders.delete'],
          approved: ['approvals.work_orders']
        }
      },
      {
        id: 'drawing',
        name: 'Drawing',
        department: 'sales',
        permissionMap: {
          add: ['production.work_orders.edit', 'production.machining.manage'],
          edit: ['production.work_orders.edit'],
          view: ['production.work_orders.view'],
          cancel: ['production.work_orders.edit'],
          delete: ['production.work_orders.edit'],
          approved: ['approvals.work_orders']
        }
      }
    ]
  },

  // ── 2. STORES & PROCUREMENT DEPARTMENT ───────────────────────────────────
  {
    id: 'stores',
    title: 'Stores & Procurement Department',
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
    entities: [
      {
        id: 'bom',
        name: 'BOM',
        department: 'stores',
        permissionMap: {
          add: ['production.work_orders.create'],
          edit: ['production.work_orders.edit'],
          view: ['production.work_orders.view', 'inventory.items.view'],
          cancel: ['production.work_orders.edit'],
          delete: ['production.work_orders.delete'],
          approved: ['approvals.work_orders']
        }
      },
      {
        id: 'mr',
        name: 'MR (Material Requisition)',
        department: 'stores',
        permissionMap: {
          add: ['purchasing.mr.manage'],
          edit: ['purchasing.mr.manage'],
          view: ['purchasing.mr.manage', 'inventory.items.view'],
          cancel: ['purchasing.mr.manage'],
          delete: ['purchasing.mr.manage'],
          approved: ['approvals.material_requests']
        }
      },
      {
        id: 'sample_grn',
        name: 'Sample GRN',
        department: 'stores',
        permissionMap: {
          add: ['inventory.customer_grn.manage'],
          edit: ['inventory.customer_grn.manage'],
          view: ['inventory.customer_grn.manage', 'inventory.items.view'],
          cancel: ['inventory.customer_grn.manage'],
          delete: ['inventory.customer_grn.manage'],
          approved: ['inventory.customer_grn.manage']
        }
      },
      {
        id: 'material_issue_note',
        name: 'Material Issue Note',
        department: 'stores',
        permissionMap: {
          add: ['inventory.ledger.manage', 'inventory.stock_ledger.view'],
          edit: ['inventory.ledger.manage'],
          view: ['inventory.stock_ledger.view', 'inventory.items.view'],
          cancel: ['inventory.ledger.manage'],
          delete: ['inventory.ledger.manage'],
          approved: ['inventory.ledger.manage']
        }
      },
      {
        id: 'material_received_note',
        name: 'Material Received Note',
        department: 'stores',
        permissionMap: {
          add: ['inventory.ledger.manage', 'purchasing.grn.manage'],
          edit: ['inventory.ledger.manage'],
          view: ['inventory.stock_ledger.view', 'inventory.items.view'],
          cancel: ['inventory.ledger.manage'],
          delete: ['inventory.ledger.manage'],
          approved: ['inventory.ledger.manage']
        }
      },
      {
        id: 'grn',
        name: 'GRN (Supplier Goods Receipt)',
        department: 'stores',
        permissionMap: {
          add: ['purchasing.grn.manage', 'inventory.ledger.manage'],
          edit: ['purchasing.grn.manage'],
          view: ['purchasing.grn.manage', 'inventory.stock_ledger.view'],
          cancel: ['purchasing.grn.manage'],
          delete: ['purchasing.grn.manage'],
          approved: ['purchasing.grn.manage']
        }
      },
      {
        id: 'tool_issue_note',
        name: 'Tool Issue Note',
        department: 'stores',
        permissionMap: {
          add: ['inventory.assets.manage', 'inventory.ledger.manage'],
          edit: ['inventory.assets.manage'],
          view: ['inventory.assets.manage', 'inventory.items.view'],
          cancel: ['inventory.assets.manage'],
          delete: ['inventory.assets.manage'],
          approved: ['inventory.assets.manage']
        }
      },
      {
        id: 'tool_received_note',
        name: 'Tool Received Note',
        department: 'stores',
        permissionMap: {
          add: ['inventory.assets.manage', 'inventory.ledger.manage'],
          edit: ['inventory.assets.manage'],
          view: ['inventory.assets.manage', 'inventory.items.view'],
          cancel: ['inventory.assets.manage'],
          delete: ['inventory.assets.manage'],
          approved: ['inventory.assets.manage']
        }
      },
      {
        id: 'sample_delivery_note',
        name: 'Sample Delivery Note',
        department: 'stores',
        permissionMap: {
          add: ['inventory.gatepass.manage'],
          edit: ['inventory.gatepass.manage'],
          view: ['inventory.gatepass.manage'],
          cancel: ['inventory.gatepass.manage'],
          delete: ['inventory.gatepass.manage'],
          approved: ['inventory.gatepass.manage']
        }
      },
      {
        id: 'finished_good_received_note',
        name: 'Finished Good Received Note',
        department: 'stores',
        permissionMap: {
          add: ['inventory.ledger.manage', 'production.work_orders.edit'],
          edit: ['inventory.ledger.manage'],
          view: ['inventory.stock_ledger.view', 'inventory.items.view'],
          cancel: ['inventory.ledger.manage'],
          delete: ['inventory.ledger.manage'],
          approved: ['production.work_orders.edit']
        }
      },
      {
        id: 'finished_good_delivery_note',
        name: 'Finished Good Delivery Note',
        department: 'stores',
        permissionMap: {
          add: ['inventory.gatepass.manage', 'production.work_orders.edit'],
          edit: ['inventory.gatepass.manage'],
          view: ['inventory.gatepass.manage', 'production.work_orders.view'],
          cancel: ['inventory.gatepass.manage'],
          delete: ['inventory.gatepass.manage'],
          approved: ['inventory.gatepass.manage']
        }
      },
      {
        id: 'items',
        name: 'Items',
        department: 'stores',
        permissionMap: {
          add: ['inventory.items.create'],
          edit: ['inventory.items.edit'],
          view: ['inventory.items.view', 'inventory.items.view_details'],
          cancel: ['inventory.items.edit'],
          delete: ['inventory.items.delete'],
          approved: ['inventory.items.edit']
        }
      },
      {
        id: 'purchase_order',
        name: 'Purchase Order',
        department: 'stores',
        permissionMap: {
          add: ['purchasing.po.manage'],
          edit: ['purchasing.po.manage'],
          view: ['purchasing.po.manage', 'purchasing.suppliers.view'],
          cancel: ['purchasing.po.manage'],
          delete: ['purchasing.po.manage'],
          approved: ['approvals.purchase_orders', 'purchasing.po.manage']
        }
      },
      {
        id: 'supplier_registration',
        name: 'Supplier Registration',
        department: 'stores',
        permissionMap: {
          add: ['purchasing.suppliers.manage'],
          edit: ['purchasing.suppliers.manage'],
          view: ['purchasing.suppliers.view', 'purchasing.suppliers.manage'],
          cancel: ['purchasing.suppliers.manage'],
          delete: ['purchasing.suppliers.manage'],
          approved: ['purchasing.suppliers.manage']
        }
      }
    ]
  },

  // ── 3. DESIGN & ENGINEERING DEPARTMENT ────────────────────────────────────
  {
    id: 'design',
    title: 'Design & Engineering Department',
    badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-500',
    entities: [
      {
        id: 'bom',
        name: 'BOM',
        department: 'design',
        permissionMap: {
          add: ['production.work_orders.create', 'production.operations.manage'],
          edit: ['production.work_orders.edit', 'production.operations.manage'],
          view: ['production.work_orders.view', 'inventory.items.view'],
          cancel: ['production.work_orders.edit'],
          delete: ['production.work_orders.delete'],
          approved: ['approvals.work_orders']
        }
      },
      {
        id: 'drawing',
        name: 'Drawing',
        department: 'design',
        permissionMap: {
          add: ['production.work_orders.edit', 'production.machining.manage'],
          edit: ['production.work_orders.edit', 'production.machining.manage'],
          view: ['production.work_orders.view'],
          cancel: ['production.work_orders.edit'],
          delete: ['production.work_orders.edit'],
          approved: ['approvals.work_orders']
        }
      },
      {
        id: 'programming',
        name: 'Programming (CNC / CAM)',
        department: 'design',
        permissionMap: {
          add: ['production.machining.manage', 'production.operations.manage'],
          edit: ['production.machining.manage', 'production.operations.manage'],
          view: ['production.machining.manage', 'production.work_orders.view'],
          cancel: ['production.machining.manage'],
          delete: ['production.machining.manage'],
          approved: ['approvals.work_orders', 'production.qc.manage']
        }
      }
    ]
  },

  // ── 4. FINANCE & ACCOUNTS DEPARTMENT ─────────────────────────────────────
  {
    id: 'finance',
    title: 'Finance & Accounts Department',
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
    entities: [
      {
        id: 'invoice',
        name: 'Invoice',
        department: 'finance',
        permissionMap: {
          add: ['finance.invoices.create', 'finance.payments.record'],
          edit: ['finance.invoices.edit', 'finance.tax.manage'],
          view: ['finance.invoices.view', 'finance.receivables.view'],
          cancel: ['finance.invoices.delete'],
          delete: ['finance.invoices.delete'],
          approved: ['finance.invoices.edit', 'finance.tax.manage']
        }
      },
      {
        id: 'customer',
        name: 'Customer',
        department: 'finance',
        permissionMap: {
          add: ['crm.customers.create'],
          edit: ['crm.customers.edit', 'crm.credit.request'],
          view: ['crm.customers.view', 'finance.receivables.view'],
          cancel: ['crm.customers.edit'],
          delete: ['crm.customers.delete'],
          approved: ['approvals.credit_limit', 'crm.credit.request']
        }
      },
      {
        id: 'supplier_registration',
        name: 'Supplier Registration',
        department: 'finance',
        permissionMap: {
          add: ['purchasing.suppliers.manage'],
          edit: ['purchasing.suppliers.manage'],
          view: ['purchasing.suppliers.view', 'finance.payables.view'],
          cancel: ['purchasing.suppliers.manage'],
          delete: ['purchasing.suppliers.manage'],
          approved: ['purchasing.suppliers.manage']
        }
      },
      {
        id: 'services_quotation',
        name: 'Services Quotation',
        department: 'finance',
        permissionMap: {
          add: ['quotations.create'],
          edit: ['quotations.edit'],
          view: ['quotations.view', 'quotations.view_all'],
          cancel: ['quotations.delete'],
          delete: ['quotations.delete'],
          approved: ['approvals.quotations']
        }
      },
      {
        id: 'product_quotation',
        name: 'Product Quotation',
        department: 'finance',
        permissionMap: {
          add: ['quotations.create'],
          edit: ['quotations.edit'],
          view: ['quotations.view', 'quotations.view_all'],
          cancel: ['quotations.delete'],
          delete: ['quotations.delete'],
          approved: ['approvals.quotations']
        }
      },
      {
        id: 'sales_order',
        name: 'Sales Order',
        department: 'finance',
        permissionMap: {
          add: ['production.work_orders.create'],
          edit: ['production.work_orders.edit'],
          view: ['production.work_orders.view', 'quotations.view_all'],
          cancel: ['production.work_orders.delete'],
          delete: ['production.work_orders.delete'],
          approved: ['approvals.work_orders']
        }
      },
      {
        id: 'delivery_note',
        name: 'Delivery Note',
        department: 'finance',
        permissionMap: {
          add: ['inventory.gatepass.manage', 'finance.invoices.create'],
          edit: ['inventory.gatepass.manage'],
          view: ['inventory.gatepass.manage', 'finance.invoices.view'],
          cancel: ['inventory.gatepass.manage'],
          delete: ['inventory.gatepass.manage'],
          approved: ['inventory.gatepass.manage']
        }
      },
      {
        id: 'ledger',
        name: 'Ledger',
        department: 'finance',
        permissionMap: {
          add: ['finance.journals.create', 'finance.payments.record'],
          edit: ['finance.journals.create', 'finance.banking.manage'],
          view: ['finance.accounting.view', 'finance.banking.view', 'finance.reports.view'],
          cancel: ['finance.journals.create'],
          delete: ['finance.journals.create'],
          approved: ['finance.accounting.view', 'finance.reports.view']
        }
      },
      {
        id: 'inventory',
        name: 'Inventory',
        department: 'finance',
        permissionMap: {
          add: ['inventory.ledger.manage'],
          edit: ['inventory.ledger.manage'],
          view: ['inventory.items.view', 'inventory.stock_ledger.view'],
          cancel: ['inventory.ledger.manage'],
          delete: ['inventory.items.delete'],
          approved: ['inventory.stock_ledger.view']
        }
      }
    ]
  }
];

// Matrix record for an entity
export type ExcelEntityMatrix = Record<ExcelAction, boolean>;

// Full department matrix: entityId -> ExcelEntityMatrix
export type ExcelDepartmentMatrix = Record<string, ExcelEntityMatrix>;

// Complete role matrix
export type ExcelRoleMatrix = Record<string, ExcelDepartmentMatrix>;

export interface ExcelRolePreset {
  id: string;
  name: string;
  department: 'sales' | 'stores' | 'design' | 'finance';
  description: string;
  matrix: Record<string, Partial<Record<ExcelAction, boolean>>>;
}

/**
 * The 11 exact role presets matching the user's Excel spreadsheet.
 */
export const EXCEL_ROLE_PRESETS: ExcelRolePreset[] = [
  // ── SALES PRESETS ────────────────────────────────────────────────────────
  {
    id: 'crm_manager',
    name: 'CRM Manager',
    department: 'sales',
    description: 'Customer relationship leadership, customer registration, pipeline control, and quotation approvals.',
    matrix: {
      leads: { add: true, edit: true, view: true },
      customer_registration: { add: true, edit: false, view: true },
      sample_grn: { add: true, edit: true, view: true },
      services_quotation: { add: true, edit: true, view: true, approved: true },
      product_quotation: { add: true, edit: false, view: true, approved: true },
      sales_order: { add: true, edit: true, view: true },
      bom: { add: true, edit: true, view: true },
      drawing: { add: true, edit: true, view: true }
    }
  },
  {
    id: 'sales_engineer',
    name: 'Sales Engineer',
    department: 'sales',
    description: 'Technical sales inquiries, sample receipts, BOM drafting, and customer order processing.',
    matrix: {
      leads: { add: true, edit: true, view: true },
      customer_registration: { add: true, edit: false, view: true },
      sample_grn: { add: true, edit: true, view: true },
      services_quotation: { add: true, edit: false, view: true },
      sales_order: { add: true, edit: false, view: true },
      bom: { add: true, edit: true, view: true },
      drawing: { add: true, edit: true, view: true }
    }
  },
  {
    id: 'tech_sales_officer',
    name: 'Technical Sales Officer',
    department: 'sales',
    description: 'Technical quoting, engineering estimates, customer product drawings, and BOM review.',
    matrix: {
      leads: { add: true, edit: true, view: true },
      sample_grn: { add: true, edit: false, view: true },
      customer_registration: { add: true, edit: false, view: true },
      product_quotation: { add: true, edit: true, view: true },
      sales_order: { add: true, edit: false, view: true },
      bom: { add: true, edit: true, view: true },
      drawing: { add: true, edit: true, view: true }
    }
  },

  // ── STORES PRESETS ───────────────────────────────────────────────────────
  {
    id: 'store_keeper',
    name: 'Store Keeper',
    department: 'stores',
    description: 'Warehouse material receipts, tool issues, goods delivery notes, and stock movements.',
    matrix: {
      bom: { add: false, edit: true, view: true },
      mr: { add: true, edit: false, view: true },
      sample_grn: { add: true, edit: false, view: true },
      material_issue_note: { add: true, edit: false, view: true },
      material_received_note: { add: true, edit: false, view: true },
      grn: { add: true, edit: false, view: true },
      tool_issue_note: { add: true, edit: false, view: true },
      tool_received_note: { add: true, edit: false, view: true },
      sample_delivery_note: { add: true, edit: false, view: true },
      finished_good_received_note: { add: true, edit: false, view: true },
      finished_good_delivery_note: { add: true, edit: false, view: true },
      items: { add: false, edit: false, view: true }
    }
  },
  {
    id: 'store_assistant',
    name: 'Store Assistant',
    department: 'stores',
    description: 'Assisting workshop material requests, stock handling, tool checks, and delivery notes.',
    matrix: {
      bom: { add: false, edit: true, view: true },
      mr: { add: true, edit: false, view: true },
      sample_grn: { add: true, edit: false, view: true },
      material_issue_note: { add: true, edit: false, view: true },
      material_received_note: { add: true, edit: false, view: true },
      grn: { add: true, edit: false, view: true },
      tool_issue_note: { add: true, edit: false, view: true },
      tool_received_note: { add: true, edit: false, view: true },
      sample_delivery_note: { add: true, edit: false, view: true },
      finished_good_received_note: { add: true, edit: false, view: true },
      finished_good_delivery_note: { add: true, edit: false, view: true },
      items: { add: false, edit: false, view: true }
    }
  },
  {
    id: 'procurement_officer',
    name: 'Procurement Officer',
    department: 'stores',
    description: 'Purchase orders, supplier registration, material requisitions, and vendor goods receipts.',
    matrix: {
      bom: { add: true, edit: true, view: true },
      mr: { add: true, edit: true, view: true },
      grn: { add: true, edit: true, view: true },
      items: { add: true, edit: true, view: true },
      purchase_order: { add: true, edit: true, view: true },
      supplier_registration: { add: true, edit: true, view: true }
    }
  },

  // ── DESIGN PRESETS ───────────────────────────────────────────────────────
  {
    id: 'chief_designer',
    name: 'Chief Designer',
    department: 'design',
    description: 'Engineering sign-off, CAD drawing approval, full BOM releases, and CNC program verification.',
    matrix: {
      bom: { add: true, edit: true, view: true, approved: true },
      drawing: { add: true, edit: true, view: true, approved: true },
      programming: { add: true, edit: true, view: true, approved: true }
    }
  },
  {
    id: 'assistant_designer',
    name: 'Assistant Designer',
    department: 'design',
    description: 'Component modeling, CAD revisions, and technical BOM preparation.',
    matrix: {
      bom: { add: true, edit: true, view: true },
      drawing: { add: false, edit: false, view: true },
      programming: { add: false, edit: false, view: false }
    }
  },
  {
    id: 'cnc_programmer',
    name: 'Programmer (CNC / CAM)',
    department: 'design',
    description: 'CAM programming, G-code path generation, tool setup, and technical drawing inspection.',
    matrix: {
      drawing: { add: false, edit: false, view: true },
      programming: { add: true, edit: true, view: true }
    }
  },

  // ── FINANCE PRESETS ──────────────────────────────────────────────────────
  {
    id: 'finance_manager',
    name: 'Finance Manager',
    department: 'finance',
    description: 'Fiscal controllership, tax invoicing authorization, customer credit approval, and ledger entries.',
    matrix: {
      invoice: { add: true, edit: true, view: true, approved: true },
      customer: { add: true, edit: true, view: true, approved: true },
      supplier_registration: { add: false, edit: false, view: true },
      services_quotation: { add: false, edit: false, view: true },
      product_quotation: { add: false, edit: false, view: true },
      sales_order: { add: false, edit: false, view: true },
      delivery_note: { add: true, edit: true, view: true },
      ledger: { add: true, edit: true, view: true },
      inventory: { add: false, edit: false, view: true }
    }
  },
  {
    id: 'finance_executive',
    name: 'Finance Executive',
    department: 'finance',
    description: 'Invoicing creation, payment receipts, customer credit tracking, and general ledger journal postings.',
    matrix: {
      invoice: { add: true, edit: false, view: true, approved: true },
      customer: { add: true, edit: true, view: true },
      supplier_registration: { add: false, edit: false, view: true },
      services_quotation: { add: false, edit: false, view: true },
      product_quotation: { add: false, edit: false, view: true },
      sales_order: { add: false, edit: false, view: true },
      delivery_note: { add: false, edit: false, view: true },
      ledger: { add: true, edit: false, view: true },
      inventory: { add: false, edit: false, view: true }
    }
  }
];

/**
 * Compiles a visual Excel matrix into flat permission string IDs.
 */
export function compileMatrixToPermissionIds(
  matrix: Record<string, Partial<Record<ExcelAction, boolean>>>
): string[] {
  const permSet = new Set<string>();

  for (const dept of EXCEL_DEPARTMENTS) {
    for (const entity of dept.entities) {
      const entityPerms = matrix[entity.id];
      if (!entityPerms) continue;

      const actions: ExcelAction[] = ['add', 'edit', 'view', 'cancel', 'delete', 'approved'];
      for (const action of actions) {
        if (entityPerms[action]) {
          const mappedPerms = entity.permissionMap[action];
          if (Array.isArray(mappedPerms)) {
            for (const p of mappedPerms) {
              permSet.add(p);
            }
          }
        }
      }
    }
  }

  return Array.from(permSet);
}

/**
 * Converts a list of permission string IDs into the visual Excel matrix.
 */
export function decompilePermissionsToMatrix(
  permissions: string[] | undefined
): Record<string, Partial<Record<ExcelAction, boolean>>> {
  const matrix: Record<string, Partial<Record<ExcelAction, boolean>>> = {};
  const permList = Array.isArray(permissions) ? permissions : [];
  const isAdmin = permList.includes('*');

  for (const dept of EXCEL_DEPARTMENTS) {
    for (const entity of dept.entities) {
      if (!matrix[entity.id]) {
        matrix[entity.id] = {};
      }

      const actions: ExcelAction[] = ['add', 'edit', 'view', 'cancel', 'delete', 'approved'];
      for (const action of actions) {
        if (isAdmin) {
          matrix[entity.id][action] = true;
          continue;
        }

        const mappedPerms = entity.permissionMap[action] || [];
        if (mappedPerms.length === 0) {
          matrix[entity.id][action] = false;
        } else {
          // If any mapped permission is present, consider granted
          matrix[entity.id][action] = mappedPerms.some(p => permList.includes(p));
        }
      }
    }
  }

  return matrix;
}

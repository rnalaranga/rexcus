export type CustomerRelationshipTier =
  | 'vip_partner'
  | 'past_buyer'
  | 'needs_care'
  | 'new_prospect';

export interface AIRecommendedFollowup {
  type: 'call' | 'whatsapp' | 'meeting' | 'email' | 'site_visit' | 'task';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  dueTime: string;
  subject: string;
  notes: string;
  reason: string;
}

export interface AICustomerProfile {
  tier: CustomerRelationshipTier;
  badgeLabel: string;
  shortLabel: string;
  sinhalaTag: string;
  trustScore: number;
  isRegisteredCustomer: boolean;
  matchedCustomerId: string | null;
  matchedCustomer: any | null;
  companyName: string;
  contactName: string;
  phone: string;
  ordersCount: number;
  totalSalesRevenue: number;
  wonLeadsCount: number;
  lostLeadsCount: number;
  quotesCount: number;
  paidInvoicesCount: number;
  overdueInvoicesCount: number;
  winRate: number;
  lastOrderDate: string | null;
  lastOrderNo: string | null;
  daysIdle: number;
  pendingFollowups: any[];
  completedFollowups: any[];
  nextFollowup: any | null;
  overdueFollowupsCount: number;
  relationshipSummary: string;
  aiSuggestion: string;
  recommendedFollowup: AIRecommendedFollowup;
}

export interface AICustomerContext {
  customers?: any[];
  salesOrders?: any[];
  invoices?: any[];
  quotations?: any[];
  leads?: any[];
  followups?: any[];
}

export interface AIFollowupRecommendationItem {
  lead: any;
  profile: AICustomerProfile;
  urgencyScore: number;
  urgencyTag: 'overdue_followup' | 'critical_aging' | 'vip_idle' | 'proposal_followup' | 'unscheduled';
  urgencyLabel: string;
}

const normStr = (v: any): string =>
  String(v || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

const normCompany = (v: any): string =>
  normStr(v)
    .replace(/\b(PVT|LTD|LIMITED|INC|CORP|PLC|CO|LLC)\b\.?/g, '')
    .replace(/[^A-Z0-9]/g, '');

const normPhone = (v: any): string => {
  const digits = String(v || '').replace(/\D/g, '');
  if (digits.length < 7) return '';
  return digits.slice(-9);
};

const addDaysIso = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const formatLkrCompact = (val: number): string => {
  const n = Number(val || 0);
  if (!isFinite(n) || n <= 0) return 'Rs. 0';
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `Rs. ${Math.round(n / 1_000).toLocaleString()}k`;
  return `Rs. ${Math.round(n).toLocaleString()}`;
};

export const calcDaysSince = (dateStr?: any): number => {
  if (!dateStr) return 0;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
};

const normalizeFollowupStatus = (f: any): string => {
  const raw = String(f?.status || 'pending').trim().toLowerCase();
  if (raw === 'completed' || raw === 'done') return 'done';
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled';
  if (raw === 'overdue') return 'overdue';
  if (raw === 'pending' && f?.dueDate) {
    const dueTs = new Date(String(f.dueDate)).getTime();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (!isNaN(dueTs) && dueTs < todayStart.getTime()) {
      return 'overdue';
    }
  }
  return 'pending';
};

function matchesEntity(
  record: {
    customerId?: any;
    leadId?: any;
    company?: any;
    customerCompany?: any;
    leadCompany?: any;
    name?: any;
    customerName?: any;
    leadName?: any;
    phone?: any;
    customerPhone?: any;
    relatedId?: any;
    relatedName?: any;
  },
  keys: {
    id?: string;
    customerId?: string;
    companyRaw: string;
    companyClean: string;
    phoneLast9: string;
  }
): boolean {
  const recCustId = String(record.customerId || '').trim();
  const recLeadId = String(record.leadId || '').trim();
  const recRelId = String(record.relatedId || '').trim();

  if (keys.customerId && recCustId && recCustId === keys.customerId) return true;
  if (keys.id && (recLeadId === keys.id || recRelId === keys.id || recCustId === keys.id)) return true;
  if (keys.customerId && recRelId && recRelId === keys.customerId) return true;

  const recCompanies = [
    record.company,
    record.customerCompany,
    record.leadCompany,
    record.relatedName,
    record.customerName,
    record.leadName,
  ]
    .map(normCompany)
    .filter(Boolean);

  if (keys.companyClean && keys.companyClean.length >= 3) {
    if (recCompanies.some((c) => c === keys.companyClean)) return true;
  }

  if (keys.phoneLast9) {
    const recPhone = normPhone(record.phone || record.customerPhone);
    if (recPhone && recPhone === keys.phoneLast9) return true;
  }

  return false;
}

export function analyzeCustomerIntelligence(
  target: any,
  context: AICustomerContext = {}
): AICustomerProfile {
  const customers = Array.isArray(context.customers) ? context.customers : [];
  const salesOrders = Array.isArray(context.salesOrders) ? context.salesOrders : [];
  const invoices = Array.isArray(context.invoices) ? context.invoices : [];
  const quotations = Array.isArray(context.quotations) ? context.quotations : [];
  const leads = Array.isArray(context.leads) ? context.leads : [];
  const followups = Array.isArray(context.followups) ? context.followups : [];

  const targetId = String(target?.id || '').trim();
  const explicitCustomerId = String(
    target?.customerId || (targetId.startsWith('CUST-') ? targetId : '')
  ).trim();
  const companyName = String(
    target?.company ||
      target?.customerCompany ||
      target?.customerCompanyName ||
      target?.relatedName ||
      target?.name ||
      'Prospect'
  ).trim();
  const contactName = String(
    target?.name || target?.customerContactName || target?.customerName || ''
  ).trim();
  const phone = String(target?.phone || target?.customerPhone || '').trim();

  const keys = {
    id: targetId,
    customerId: explicitCustomerId,
    companyRaw: normStr(companyName),
    companyClean: normCompany(companyName),
    phoneLast9: normPhone(phone),
  };

  // 1. Find Customer DB record
  const matchedCustomer =
    customers.find((c: any) =>
      matchesEntity(
        {
          customerId: c.id,
          company: c.company,
          name: c.name,
          phone: c.phone || c.phone2,
        },
        keys
      )
    ) || null;

  const matchedCustomerId = matchedCustomer?.id || (explicitCustomerId || null);
  const effectiveKeys = {
    ...keys,
    customerId: matchedCustomerId || keys.customerId,
    companyClean: keys.companyClean || normCompany(matchedCustomer?.company),
    phoneLast9: keys.phoneLast9 || normPhone(matchedCustomer?.phone),
  };

  // 2. Match Sales Orders (Finished Goods Orders)
  const matchedOrders = salesOrders.filter((o: any) => {
    const st = String(o?.status || '').trim().toLowerCase();
    if (st === 'cancelled' || st === 'canceled' || o?.isCancelled) return false;
    return matchesEntity(o, effectiveKeys);
  });

  // 3. Match Invoices (excluding deleted and proforma)
  const matchedInvoices = invoices.filter((inv: any) => {
    if (inv?.isDeleted || inv?.deletedAt || inv?.isProforma) return false;
    const st = String(inv?.status || '').trim().toLowerCase();
    if (st === 'cancelled' || st === 'void') return false;
    return matchesEntity(inv, effectiveKeys);
  });

  const paidInvoices = matchedInvoices.filter((inv: any) => {
    const st = String(inv?.status || '').trim().toLowerCase();
    const bal = Number(inv?.balance ?? 0);
    return st === 'paid' || (Number(inv?.paidAmount || 0) > 0 && bal <= 1);
  });

  const overdueInvoices = matchedInvoices.filter((inv: any) => {
    const st = String(inv?.status || '').trim().toLowerCase();
    const bal = Number(inv?.balance ?? (Number(inv?.totalAmount || 0) - Number(inv?.paidAmount || 0)));
    if (st === 'paid' || bal <= 1) return false;
    if (st === 'overdue') return true;
    if (inv?.dueDate) {
      return new Date(inv.dueDate).getTime() < Date.now();
    }
    return false;
  });

  // 4. Match Quotations
  const matchedQuotes = quotations.filter((q: any) => {
    if (q?.deletedAt) return false;
    if (String(q?.type || '').includes('draft')) return false;
    return matchesEntity(
      {
        leadId: q.leadId,
        customerId: q.customerId,
        leadCompany: q.leadCompany,
        customerCompany: q.customerCompany,
        leadName: q.leadName,
        customerName: q.customerName,
      },
      effectiveKeys
    );
  });

  // 5. Match Historical Leads for Won / Lost history
  const matchedLeads = leads.filter((l: any) =>
    matchesEntity(
      {
        leadId: l.id,
        customerId: l.customerId,
        company: l.company,
        name: l.name,
        phone: l.phone,
      },
      effectiveKeys
    )
  );
  const wonLeadsCount = matchedLeads.filter(
    (l: any) => String(l.stage || '').toLowerCase() === 'won'
  ).length;
  const lostLeadsCount = matchedLeads.filter(
    (l: any) => String(l.stage || '').toLowerCase() === 'lost'
  ).length;

  // 6. Match Followups
  const matchedFollowups = followups.filter((f: any) =>
    matchesEntity(
      {
        relatedId: f.relatedId,
        relatedName: f.relatedName,
      },
      effectiveKeys
    )
  );

  const pendingFollowups = matchedFollowups
    .filter((f: any) => {
      const s = normalizeFollowupStatus(f);
      return s === 'pending' || s === 'overdue';
    })
    .sort(
      (a: any, b: any) =>
        new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
    );

  const completedFollowups = matchedFollowups.filter(
    (f: any) => normalizeFollowupStatus(f) === 'done'
  );
  const overdueFollowupsCount = pendingFollowups.filter(
    (f: any) => normalizeFollowupStatus(f) === 'overdue'
  ).length;
  const nextFollowup = pendingFollowups[0] || null;

  // 7. Revenue & Order Calculations (avoid double counting order vs invoice)
  const ordersCount = matchedOrders.length;
  const ordersRevenue = matchedOrders.reduce(
    (s: number, o: any) => s + Number(o?.totalPrice || o?.totalAmount || o?.subtotal || 0),
    0
  );
  const invoicesRevenue = matchedInvoices.reduce(
    (s: number, i: any) => s + Number(i?.totalAmount || i?.subtotal || 0),
    0
  );
  const custDbRevenue = Number(
    matchedCustomer?.totalRevenue || matchedCustomer?.lifetimeValue || 0
  );
  const totalSalesRevenue = Math.max(ordersRevenue, invoicesRevenue, custDbRevenue);

  const sortedOrders = [...matchedOrders].sort(
    (a: any, b: any) =>
      new Date(b.orderDate || b.createdAt || 0).getTime() -
      new Date(a.orderDate || a.createdAt || 0).getTime()
  );
  const lastOrder = sortedOrders[0] || null;
  const lastOrderDate = lastOrder?.orderDate || lastOrder?.createdAt || matchedCustomer?.lastOrder || null;
  const lastOrderNo = lastOrder?.orderNo || lastOrder?.id || null;

  const stage = String(target?.stage || 'new').toLowerCase();
  const daysIdle = calcDaysSince(target?.lastActivity || target?.updatedAt || target?.createdAt);
  const leadValue = Number(target?.value || 0);

  const closedOutcomes = Math.max(wonLeadsCount + ordersCount, 0) + lostLeadsCount;
  const winRate =
    closedOutcomes > 0
      ? Math.min(100, Math.round((Math.max(wonLeadsCount, ordersCount) / closedOutcomes) * 100))
      : matchedQuotes.length > 0
      ? 35
      : 20;

  // 8. Relationship Tier Classification
  let tier: CustomerRelationshipTier = 'new_prospect';
  if (
    ordersCount >= 2 ||
    wonLeadsCount >= 2 ||
    (ordersCount >= 1 && totalSalesRevenue >= 250000) ||
    Number(matchedCustomer?.rating || 0) >= 4
  ) {
    tier = 'vip_partner';
  } else if (
    ordersCount === 1 ||
    wonLeadsCount === 1 ||
    paidInvoices.length >= 1 ||
    totalSalesRevenue > 0
  ) {
    tier = 'past_buyer';
  } else if (
    (lostLeadsCount >= 1 && ordersCount === 0 && wonLeadsCount === 0) ||
    overdueInvoices.length > 0
  ) {
    tier = 'needs_care';
  }

  // Override to needs_care if VIP/past buyer has overdue unpaid invoices with severe exposure
  if (overdueInvoices.length >= 2 && ordersCount === 0) {
    tier = 'needs_care';
  }

  // 9. Trust Score (0–100)
  let trustScore = 45;
  if (matchedCustomer) trustScore += 15;
  trustScore += Math.min(25, ordersCount * 10);
  trustScore += Math.min(10, wonLeadsCount * 5);
  trustScore += Math.min(10, paidInvoices.length * 4);
  trustScore -= Math.min(20, lostLeadsCount * 8);
  trustScore -= Math.min(20, overdueInvoices.length * 10);
  if (daysIdle >= 15 && !['won', 'lost'].includes(stage)) trustScore -= 5;
  trustScore = Math.max(15, Math.min(99, trustScore));

  // 10. Tier Metadata & AI Recommendations
  let badgeLabel = '✦ New Prospect';
  let shortLabel = 'New';
  let sinhalaTag = 'අලුත්ම Customer කෙනෙක් (පළමු ගනුදෙනුව)';
  let relationshipSummary = '';
  let aiSuggestion = '';
  let recType: AIRecommendedFollowup['type'] = 'call';
  let recPriority: AIRecommendedFollowup['priority'] = 'medium';
  let recDaysOffset = 1;
  let recSubject = '';
  let recNotes = '';
  let recReason = '';

  const overdueNote =
    overdueInvoices.length > 0
      ? ` Note: ${overdueInvoices.length} overdue invoice(s) pending — coordinate politely with Finance.`
      : '';

  if (tier === 'vip_partner') {
    badgeLabel = '★ VIP Repeat Partner';
    shortLabel = 'VIP Repeat';
    sinhalaTag = 'කලින් අපිත් එක්ක හොඳටම වැඩ කරපු VIP Customer කෙනෙක්';
    relationshipSummary = `Proven Repeat Partner with ${ordersCount} past order(s) totaling ${formatLkrCompact(totalSalesRevenue)}${lastOrderNo ? ` (Last order: ${lastOrderNo})` : ''}.${overdueNote}`;

    if (stage === 'proposal' && daysIdle >= 8) {
      aiSuggestion =
        `VIP repeat client quote idle ${daysIdle}d — direct relationship call from Sales Lead or fast-track priority delivery option to close quickly.`;
      recType = 'call';
      recPriority = 'high';
      recDaysOffset = 0;
      recSubject = `Priority VIP Proposal Check-in — ${companyName}`;
      recNotes = `AI Insight: ${companyName} is a proven VIP Repeat Partner (${ordersCount} orders, ${formatLkrCompact(totalSalesRevenue)}). Proposal has been idle ${daysIdle}d. Offer loyal-partner turnaround priority and confirm PO timeline.`;
      recReason = `VIP customer (${ordersCount} prior orders) idle ${daysIdle}d in Proposal`;
    } else if (stage === 'negotiation') {
      aiSuggestion =
        `High trust (${trustScore}%). Confirm final PO release, payment terms (${matchedCustomer?.defaultPaymentMode || 'agreed terms'}), and production slot reservation.`;
      recType = 'call';
      recPriority = 'high';
      recDaysOffset = 0;
      recSubject = `PO & Slot Confirmation (VIP) — ${companyName}`;
      recNotes = `AI Insight: High-value repeat customer (${formatLkrCompact(totalSalesRevenue)} history). Confirm purchase order number and production start schedule today.`;
      recReason = `VIP in Negotiation stage — high close probability`;
    } else {
      aiSuggestion =
        `Strong repeat customer (${ordersCount} orders, ${formatLkrCompact(totalSalesRevenue)}). Fast-track technical quote & proactively mention past quality track record.`;
      recType = matchedQuotes.length > 0 ? 'call' : 'whatsapp';
      recPriority = daysIdle >= 5 ? 'high' : 'medium';
      recDaysOffset = daysIdle >= 5 ? 0 : 2;
      recSubject = `VIP Check-in & Requirement Confirmation — ${companyName}`;
      recNotes = `AI Insight: Repeat VIP client (${ordersCount} orders). Maintain warm relationship, verify technical specs/samples, and move quickly to quotation.`;
      recReason = `VIP account requires proactive relationship touchpoint`;
    }
  } else if (tier === 'past_buyer') {
    badgeLabel = '✓ Past Buyer';
    shortLabel = 'Worked Before';
    sinhalaTag = 'කලින් අපිත් එක්ක වැඩ කරපු Customer කෙනෙක්';
    relationshipSummary = `Worked with us previously (${ordersCount} order(s), ${formatLkrCompact(totalSalesRevenue)} sales history${wonLeadsCount > 0 ? `, ${wonLeadsCount} won deal(s)` : ''}).${overdueNote}`;

    if (stage === 'proposal' && daysIdle >= 8) {
      aiSuggestion =
        `Worked with us before (${formatLkrCompact(totalSalesRevenue)}). Call directly with a reference to past delivery satisfaction & ask for feedback on quote.`;
      recType = 'call';
      recPriority = 'high';
      recDaysOffset = 0;
      recSubject = `Quotation Follow-up (Repeat Client) — ${companyName}`;
      recNotes = `AI Insight: ${companyName} has worked with us before (${ordersCount} order(s), ${formatLkrCompact(totalSalesRevenue)}). Quote has been idle ${daysIdle} days. Call to verify technical alignment and ask when PO can be expected.`;
      recReason = `Repeat customer proposal idle ${daysIdle}d`;
    } else {
      aiSuggestion =
        `Established past customer. Skip cold intro — send personalized WhatsApp/call referencing past collaboration to lock in the repeat order.`;
      recType = 'whatsapp';
      recPriority = leadValue >= 150000 || daysIdle >= 6 ? 'high' : 'medium';
      recDaysOffset = daysIdle >= 6 ? 0 : 1;
      recSubject = `Repeat Order Follow-up — ${companyName}`;
      recNotes = `AI Insight: Customer already trusts Rex Industries (${formatLkrCompact(totalSalesRevenue)} past business). Send quick WhatsApp / call update to convert cleanly.`;
      recReason = `Past buyer — strong conversion opportunity`;
    }
  } else if (tier === 'needs_care') {
    badgeLabel = '⚠ Needs Care';
    shortLabel = 'Needs Care';
    sinhalaTag = 'කලින් Quote Lost / ගෙවීම් අවධානය යොමු කළ යුතුයි';
    relationshipSummary =
      overdueInvoices.length > 0
        ? `${overdueInvoices.length} overdue invoice(s) found alongside ${lostLeadsCount} past lost lead(s). Check credit terms carefully.`
        : `Previously quoted (${lostLeadsCount} lost lead(s), ${matchedQuotes.length} quote(s)) with 0 converted orders so far.`;

    aiSuggestion =
      overdueInvoices.length > 0
        ? `Verify overdue balance clearance with Finance first, and request Advance Payment / clear PO terms before committing production.`
        : `Previously lost quote(s) (${lostLeadsCount}). Focus on pricing competitiveness, delivery lead time, and schedule a direct phone/meeting review.`;
    recType = 'call';
    recPriority = 'high';
    recDaysOffset = 0;
    recSubject = `Commercial & Feedback Review — ${companyName}`;
    recNotes = `AI Insight: Needs careful handling (${lostLeadsCount} lost quote(s)${overdueInvoices.length > 0 ? `, ${overdueInvoices.length} overdue invoice(s)` : ''}). Understand pricing/lead-time objections clearly and verify payment terms.`;
    recReason = `Past lost inquiry or overdue invoice requires commercial review`;
  } else {
    badgeLabel = '✦ New Prospect';
    shortLabel = 'New Prospect';
    sinhalaTag = 'අලුත්ම Customer කෙනෙක් (First-Time Inquiry)';
    relationshipSummary = matchedQuotes.length > 0
      ? `First-time prospect with ${matchedQuotes.length} quotation(s) generated. No completed orders yet.`
      : `Brand new inquiry with no previous order history in our ERP.`;

    if (stage === 'proposal') {
      aiSuggestion =
        daysIdle >= 8
          ? `New customer proposal idle ${daysIdle}d! Follow up immediately by call + WhatsApp, offer factory visit or sample reassurance to build trust.`
          : `New client evaluating our proposal. Share company profile/past work quality photos on WhatsApp and check in within 3 days.`;
      recType = daysIdle >= 8 ? 'call' : 'whatsapp';
      recPriority = daysIdle >= 8 ? 'high' : 'medium';
      recDaysOffset = daysIdle >= 8 ? 0 : 2;
      recSubject = `Proposal Trust Check & Follow-up — ${companyName}`;
      recNotes = `AI Insight: First-time prospect (${companyName}). Because they haven't ordered from us yet, reassure them on Rex Industries machining precision, QA, and lead time.`;
      recReason = `New prospect in Proposal — trust building needed`;
    } else if (stage === 'qualified' || stage === 'contacted') {
      aiSuggestion =
        `New prospect (${matchedCustomer ? 'registered lead' : 'not yet in Customer DB'}). Collect physical sample / CAD drawing details quickly & introduce capabilities.`;
      recType = 'call';
      recPriority = leadValue >= 200000 ? 'high' : 'medium';
      recDaysOffset = 1;
      recSubject = `Sample / Technical Specs Discovery — ${companyName}`;
      recNotes = `AI Insight: New prospect. Confirm dimensions, required material grade, target quantity, and whether a physical sample GRN pickup is needed.`;
      recReason = `New prospect needs specs/sample collection to advance`;
    } else {
      aiSuggestion =
        `First-time inquiry. Make an introductory phone call within 24h, qualify their budget & urgency, and schedule technical follow-up.`;
      recType = 'call';
      recPriority = leadValue >= 150000 ? 'high' : 'medium';
      recDaysOffset = 0;
      recSubject = `First Introductory Call — ${companyName}`;
      recNotes = `AI Insight: Brand-new customer inquiry. Introduce Rex Industries engineering services and qualify timeline & technical requirements.`;
      recReason = `New inquiry needs rapid initial contact`;
    }
  }

  return {
    tier,
    badgeLabel,
    shortLabel,
    sinhalaTag,
    trustScore,
    isRegisteredCustomer: Boolean(matchedCustomer),
    matchedCustomerId,
    matchedCustomer,
    companyName,
    contactName,
    phone,
    ordersCount,
    totalSalesRevenue,
    wonLeadsCount,
    lostLeadsCount,
    quotesCount: matchedQuotes.length,
    paidInvoicesCount: paidInvoices.length,
    overdueInvoicesCount: overdueInvoices.length,
    winRate,
    lastOrderDate,
    lastOrderNo,
    daysIdle,
    pendingFollowups,
    completedFollowups,
    nextFollowup,
    overdueFollowupsCount,
    relationshipSummary,
    aiSuggestion,
    recommendedFollowup: {
      type: recType,
      priority: recPriority,
      dueDate: addDaysIso(recDaysOffset),
      dueTime: '09:30',
      subject: recSubject,
      notes: recNotes,
      reason: recReason,
    },
  };
}

export function buildAIFollowupRecommendations(
  leads: any[] = [],
  context: AICustomerContext = {}
): AIFollowupRecommendationItem[] {
  const activeLeads = (leads || []).filter(
    (l: any) => !['won', 'lost'].includes(String(l?.stage || '').toLowerCase())
  );

  const items: AIFollowupRecommendationItem[] = [];

  for (const lead of activeLeads) {
    const profile = analyzeCustomerIntelligence(lead, context);
    const hasOverdueFollowup = profile.overdueFollowupsCount > 0;
    const hasFutureFollowup = profile.pendingFollowups.length > 0 && !hasOverdueFollowup;
    const stage = String(lead?.stage || 'new').toLowerCase();

    // Calculate urgency score
    let urgencyScore = 0;
    let urgencyTag: AIFollowupRecommendationItem['urgencyTag'] = 'unscheduled';
    let urgencyLabel = 'Needs Follow-up';

    if (hasOverdueFollowup) {
      urgencyScore += 55;
      urgencyTag = 'overdue_followup';
      urgencyLabel = 'Overdue Follow-up';
    }
    if (stage === 'proposal' && profile.daysIdle >= 15) {
      urgencyScore += 45;
      if (!hasOverdueFollowup) {
        urgencyTag = 'critical_aging';
        urgencyLabel = `Critical Proposal (${profile.daysIdle}d idle)`;
      }
    } else if (stage === 'proposal' && profile.daysIdle >= 8) {
      urgencyScore += 32;
      if (!hasOverdueFollowup) {
        urgencyTag = 'proposal_followup';
        urgencyLabel = `Proposal Follow-up (${profile.daysIdle}d)`;
      }
    } else if (profile.daysIdle >= 7) {
      urgencyScore += 25;
      if (!hasOverdueFollowup) {
        urgencyTag = 'critical_aging';
        urgencyLabel = `${profile.daysIdle}d Inactive`;
      }
    }

    if (profile.tier === 'vip_partner') {
      urgencyScore += 28;
      if (urgencyTag === 'unscheduled') {
        urgencyTag = 'vip_idle';
        urgencyLabel = 'VIP Partner Check-in';
      }
    } else if (profile.tier === 'past_buyer') {
      urgencyScore += 18;
    } else if (profile.tier === 'needs_care') {
      urgencyScore += 15;
    }

    if (!hasFutureFollowup) {
      urgencyScore += 22;
      if (urgencyTag === 'unscheduled') {
        urgencyLabel = 'No Reminder Scheduled';
      }
    } else if (!hasOverdueFollowup) {
      // Already has an active future follow-up; reduce score unless severely idle
      urgencyScore -= 30;
    }

    const dealVal = Number(lead?.value || 0);
    if (dealVal >= 500000) urgencyScore += 15;
    else if (dealVal >= 150000) urgencyScore += 8;

    if (urgencyScore >= 25) {
      items.push({
        lead,
        profile,
        urgencyScore,
        urgencyTag,
        urgencyLabel,
      });
    }
  }

  return items.sort(
    (a, b) =>
      b.urgencyScore - a.urgencyScore ||
      Number(b.lead?.value || 0) - Number(a.lead?.value || 0)
  );
}

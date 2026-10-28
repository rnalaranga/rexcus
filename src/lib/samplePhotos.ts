export interface SamplePhoto {
  id: string;
  name: string;
  url: string;
  size?: number;
  date?: string;
  grnId?: string;
}

export function extractPhotosFromGrn(grn: any): SamplePhoto[] {
  if (!grn || !grn.photos) return [];
  try {
    let list: any[] = [];
    if (typeof grn.photos === 'string' && grn.photos.trim().startsWith('[')) {
      list = JSON.parse(grn.photos);
    } else if (Array.isArray(grn.photos)) {
      list = grn.photos;
    }
    if (Array.isArray(list)) {
      return list
        .map((p: any, idx: number) => ({
          id: p.id || `photo-${grn.id}-${idx}`,
          name: p.name || `Sample Photo ${idx + 1}`,
          url: p.url || p.dataUrl || '',
          size: p.size,
          date: p.date || grn.receivedAt || grn.createdAt,
          grnId: grn.id
        }))
        .filter(p => !!p.url);
    }
  } catch (e) {
    console.error('Failed to parse grn photos:', e);
  }
  return [];
}

function cleanLeadNum(val?: string | null): string {
  if (!val) return '';
  return String(val).trim().toLowerCase().replace(/^lead-0*/i, '').replace(/^0+/, '');
}

export function findMatchingSamplePhotos(
  entity: {
    id?: string | number;
    quoteId?: string | null;
    quotationId?: string | null;
    sourceQuoteId?: string | null;
    quoNo?: string | null;
    quotationNo?: string | null;
    sourceQuoteNo?: string | null;
    leadId?: string | null;
    orderNo?: string | null;
    customerName?: string | null;
    customerCompany?: string | null;
    company?: string | null;
  },
  allGrns: any[] = []
): { photos: SamplePhoto[]; grns: any[] } {
  if (!entity || !Array.isArray(allGrns) || allGrns.length === 0) {
    return { photos: [], grns: [] };
  }

  const entityIdStr = entity.id ? String(entity.id).trim() : '';
  const quoteIds = [entity.quoteId, entity.quotationId, entity.sourceQuoteId]
    .filter(Boolean)
    .map(s => String(s).trim());

  const quoteNos = [entity.quoNo, entity.quotationNo, entity.sourceQuoteNo]
    .filter(Boolean)
    .map(s => String(s).trim().toLowerCase());

  const leadIdCandidates = [
    entity.leadId,
    entityIdStr.startsWith('LEAD-') || !isNaN(Number(entityIdStr)) ? entityIdStr : null
  ].filter(Boolean).map(s => String(s).trim());

  const entityCleanLeadNums = leadIdCandidates.map(cleanLeadNum).filter(Boolean);

  const entityCustNames = [entity.customerName, entity.customerCompany, entity.company]
    .filter(Boolean)
    .map(s => String(s).trim().toLowerCase());

  const matchedGrns = allGrns.filter((g: any) => {
    if (!g) return false;

    // 1. Direct match on quoteId
    if (g.quoteId) {
      const gQuoteId = String(g.quoteId).trim();
      if (quoteIds.includes(gQuoteId)) return true;
      if (entityIdStr && gQuoteId === entityIdStr) return true;
    }

    // 2. Match on quotation document number
    const gQuoNo = String(g.quoNo || g.displayQuoNo || '').trim().toLowerCase();
    if (gQuoNo && quoteNos.includes(gQuoNo)) return true;

    // 3. Match on leadId (exact string or normalized numeric part)
    if (g.leadId) {
      const gLeadIdStr = String(g.leadId).trim();
      if (leadIdCandidates.includes(gLeadIdStr)) return true;
      const gCleanNum = cleanLeadNum(gLeadIdStr);
      if (gCleanNum && entityCleanLeadNums.includes(gCleanNum)) return true;
    }

    // 4. Match on Customer Name if GRN is linked to the same customer/lead
    if (entityCustNames.length > 0) {
      const gCust = String(g.customerName || g.customerCompany || '').trim().toLowerCase();
      if (gCust && entityCustNames.includes(gCust)) {
        // If entity is lead or has matching lead/quote or order
        if (entityCleanLeadNums.length > 0 || quoteNos.length > 0 || entity.orderNo) {
          return true;
        }
      }
    }

    return false;
  });

  const photos: SamplePhoto[] = [];
  const seenUrls = new Set<string>();

  matchedGrns.forEach(grn => {
    const grnPhotos = extractPhotosFromGrn(grn);
    grnPhotos.forEach(p => {
      if (p.url && !seenUrls.has(p.url)) {
        seenUrls.add(p.url);
        photos.push(p);
      }
    });
  });

  return { photos, grns: matchedGrns };
}

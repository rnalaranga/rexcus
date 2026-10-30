import { useMemo, useCallback } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export interface MaterialCategory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  subCategories: string[];
  isSystem?: boolean;
}

export const DEFAULT_RAW_MATERIAL_CATEGORIES: MaterialCategory[] = [
  {
    id: 'cat_metals',
    name: 'Raw Metals & Alloys',
    code: 'MET',
    description: 'Bulk raw metals including stainless steel, mild steel, carbon steel, and alloy stock',
    subCategories: ['Stainless Steel (SS)', 'Mild Steel (MS)', 'Carbon & Alloy Steel', 'Tool & Die Steel', 'Aluminum Alloys', 'Brass & Bronze', 'Copper', 'Cast Iron'],
    isSystem: true
  },
  {
    id: 'cat_plates',
    name: 'Plates & Sheets',
    code: 'PLT',
    description: 'Flat metal sheets, cut plates, shim stock, and chequered plates',
    subCategories: ['MS Plate', 'SS Plate', 'Aluminum Sheet', 'Shim Stock', 'Chequered Plate', 'Brass Sheet'],
    isSystem: true
  },
  {
    id: 'cat_bars',
    name: 'Round & Hex Bars',
    code: 'BAR',
    description: 'Solid cylindrical and hexagonal bars for turning and CNC machining',
    subCategories: ['MS Bright Round', 'SS Bright Round', 'EN8 Round', 'EN19 Round', 'EN24 Round', 'Brass Hex', 'SS Hex', 'Bronze Round'],
    isSystem: true
  },
  {
    id: 'cat_tubes',
    name: 'Pipes & Hollow Tubes',
    code: 'PIP',
    description: 'Hollow structural sections, pipes, and precision tubing',
    subCategories: ['Seamless Steel Tube', 'SS Sanitary Pipe', 'Square Hollow Section (SHS)', 'Rectangular Tube (RHS)', 'Round ERW Pipe'],
    isSystem: true
  },
  {
    id: 'cat_fasteners',
    name: 'Fasteners & Hardware',
    code: 'FST',
    description: 'Bolts, nuts, cap screws, washers, dowel pins, and threaded rods',
    subCategories: ['Hex Bolts & Nuts', 'Socket Head Cap Screws', 'Washers & Circlips', 'Studs & Threaded Rods', 'Dowel & Spring Pins', 'Rivets & Inserts'],
    isSystem: true
  },
  {
    id: 'cat_tools',
    name: 'Tools, Inserts & Cutters',
    code: 'TLS',
    description: 'Machining tooling, carbide inserts, end mills, drills, and taps',
    subCategories: ['CNC Milling Inserts', 'Carbide End Mills', 'Lathe Turning Tools', 'Drill Bits', 'Taps & Dies', 'Reamers & Boring Bars'],
    isSystem: true
  },
  {
    id: 'cat_plastics',
    name: 'Engineering Plastics & Polymers',
    code: 'ENG',
    description: 'Delrin/POM, Nylon, PTFE/Teflon, Polycarbonate, and UHMWPE',
    subCategories: ['Delrin / POM Rod & Sheet', 'Nylon 6 / 66 Rod', 'PTFE (Teflon) Sheet', 'Polycarbonate (PC)', 'UHMWPE Rod', 'Bakelite / Phenolic Sheet'],
    isSystem: true
  },
  {
    id: 'cat_electrical',
    name: 'Electrical & Automation',
    code: 'ELE',
    description: 'Motors, sensors, relays, drives, cables, and control gear',
    subCategories: ['Sensors & Switches', 'Motors & Drives', 'Relays & Contactors', 'Wiring & Cables', 'PLCs & Controllers'],
    isSystem: true
  },
  {
    id: 'cat_hydraulics',
    name: 'Hydraulics & Pneumatics',
    code: 'HYD',
    description: 'Hydraulic fittings, hoses, pneumatic valves, and cylinders',
    subCategories: ['Hydraulic Fittings', 'Pneumatic Cylinders', 'Valves & Manifolds', 'Hoses & Tubing', 'Air Filters & Regulators'],
    isSystem: true
  },
  {
    id: 'cat_bearings',
    name: 'Bearings & Bushings',
    code: 'BRG',
    description: 'Ball bearings, roller bearings, pillow blocks, and bronze bushings',
    subCategories: ['Deep Groove Ball Bearings', 'Tapered Roller Bearings', 'Linear Bearings & Rails', 'Bronze Bushings', 'Pillow Block Units'],
    isSystem: true
  },
  {
    id: 'cat_chemicals',
    name: 'Chemicals, Lubricants & Paints',
    code: 'CHM',
    description: 'Machining coolants, hydraulic oils, primers, and greases',
    subCategories: ['Cutting Coolant', 'Hydraulic Oil (ISO 68/46)', 'Epoxy Primer & Paints', 'Grease & Anti-Seize', 'Rust Preventatives & Thinners'],
    isSystem: true
  },
  {
    id: 'cat_welding',
    name: 'Welding Consumables & Gases',
    code: 'WLD',
    description: 'Welding electrodes, MIG wires, TIG rods, nozzles, and flux',
    subCategories: ['MIG Welding Wire (ER70S-6)', 'TIG Filler Rods (SS/MS/Alu)', 'Arc Welding Electrodes', 'Gas Nozzles & Contact Tips', 'Grinding & Cut-Off Discs'],
    isSystem: true
  },
  {
    id: 'cat_packaging',
    name: 'Packaging & Shipping',
    code: 'PKG',
    description: 'Corrugated cartons, stretch film, wooden crates, and labels',
    subCategories: ['Stretch Film & Strapping', 'Corrugated Cartons', 'Bubble Wrap & Cushioning', 'Wooden Crating Materials', 'Shipping Labels & Tapes'],
    isSystem: true
  },
  {
    id: 'cat_services',
    name: 'Machining & Fabrication Service',
    code: 'SRV',
    description: 'External or internal machining operations and subcontracting services',
    subCategories: ['CNC Turning Service', 'CNC Milling Service', 'Surface Grinding', 'Wire EDM Cutting', 'TIG/MIG Welding', 'Sheet Metal Bending', 'Heat Treatment & Plating'],
    isSystem: true
  },
  {
    id: 'cat_general',
    name: 'General Maintenance Supplies',
    code: 'GEN',
    description: 'Shop floor supplies, cleaning materials, PPE, and hardware',
    subCategories: ['PPE & Safety Gear', 'Shop Wipes & Degreasers', 'Hand Tools & Clamps', 'Measuring Equipment & Gauges'],
    isSystem: true
  }
];

export function useMaterialCategories() {
  const { settings, updateSettings, loading } = useSettings();

  const categories: MaterialCategory[] = useMemo(() => {
    if (settings?.raw_material_categories) {
      try {
        const parsed = JSON.parse(settings.raw_material_categories);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse raw_material_categories from settings:', e);
      }
    }
    return DEFAULT_RAW_MATERIAL_CATEGORIES;
  }, [settings?.raw_material_categories]);

  const categoryNames = useMemo(() => categories.map(c => c.name), [categories]);

  const subCategoriesMap: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const cat of categories) {
      map[cat.name] = cat.subCategories || [];
    }
    return map;
  }, [categories]);

  const saveCategories = useCallback(async (updatedList: MaterialCategory[]) => {
    await updateSettings({
      raw_material_categories: JSON.stringify(updatedList)
    });
  }, [updateSettings]);

  const addCategory = useCallback(async (newCat: Omit<MaterialCategory, 'id'>) => {
    const id = `cat_${Date.now().toString().slice(-6)}`;
    const categoryToAdd: MaterialCategory = {
      ...newCat,
      id,
      subCategories: newCat.subCategories || []
    };
    const updated = [...categories, categoryToAdd];
    await saveCategories(updated);
    return categoryToAdd;
  }, [categories, saveCategories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<MaterialCategory>) => {
    const updated = categories.map(c => c.id === id ? { ...c, ...updates } : c);
    await saveCategories(updated);
  }, [categories, saveCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    await saveCategories(updated);
  }, [categories, saveCategories]);

  return {
    categories,
    categoryNames,
    subCategoriesMap,
    loading,
    saveCategories,
    addCategory,
    updateCategory,
    deleteCategory
  };
}

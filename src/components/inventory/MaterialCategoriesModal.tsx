import React, { useState, useMemo } from 'react';
import { 
  X, Plus, Edit2, Trash2, Tag, Layers, Check, AlertCircle, 
  Search, RotateCcw, FolderPlus, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useDialog } from '@/components/ui/DialogProvider';
import { 
  useMaterialCategories, 
  MaterialCategory, 
  DEFAULT_RAW_MATERIAL_CATEGORIES 
} from '@/hooks/useMaterialCategories';

interface MaterialCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory?: any[];
  onCategorySelected?: (categoryName: string) => void;
}

export const MaterialCategoriesModal: React.FC<MaterialCategoriesModalProps> = ({
  isOpen,
  onClose,
  inventory = [],
  onCategorySelected
}) => {
  const { toast, showConfirm } = useDialog();
  const { 
    categories, 
    saveCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory 
  } = useMaterialCategories();

  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<MaterialCategory | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSubCategories, setFormSubCategories] = useState<string[]>([]);
  const [newSubCatInput, setNewSubCatInput] = useState('');

  // Item counts per category
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of inventory) {
      const cat = it.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [inventory]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      c.subCategories.some(s => s.toLowerCase().includes(q))
    );
  }, [categories, search]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormSubCategories([]);
    setNewSubCatInput('');
    setIsAddingNew(true);
  };

  const handleOpenEdit = (cat: MaterialCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormCode(cat.code || '');
    setFormDescription(cat.description || '');
    setFormSubCategories([...cat.subCategories]);
    setNewSubCatInput('');
    setIsAddingNew(true);
  };

  const handleAddSubCategory = () => {
    const val = newSubCatInput.trim();
    if (!val) return;
    if (formSubCategories.some(s => s.toLowerCase() === val.toLowerCase())) {
      toast('Sub-category already exists', 'error');
      return;
    }
    setFormSubCategories([...formSubCategories, val]);
    setNewSubCatInput('');
  };

  const handleRemoveSubCategory = (sub: string) => {
    setFormSubCategories(formSubCategories.filter(s => s !== sub));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      toast('Please enter a category name', 'error');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: cleanName,
          code: formCode.trim().toUpperCase() || cleanName.slice(0, 3).toUpperCase(),
          description: formDescription.trim(),
          subCategories: formSubCategories
        });
        toast(`Category "${cleanName}" updated successfully`, 'success');
      } else {
        // Check duplicate name
        if (categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
          toast(`Category "${cleanName}" already exists`, 'error');
          return;
        }

        const newCat = await addCategory({
          name: cleanName,
          code: formCode.trim().toUpperCase() || cleanName.slice(0, 3).toUpperCase(),
          description: formDescription.trim(),
          subCategories: formSubCategories
        });
        toast(`Category "${cleanName}" added successfully`, 'success');
        if (onCategorySelected) {
          onCategorySelected(newCat.name);
        }
      }

      setIsAddingNew(false);
      setEditingCategory(null);
    } catch (err: any) {
      toast(err.message || 'Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (cat: MaterialCategory) => {
    const count = itemCounts[cat.name] || 0;
    const msg = count > 0 
      ? `Category "${cat.name}" is currently used by ${count} inventory item(s). Deleting it will not delete the items, but they will be uncategorized. Proceed?`
      : `Are you sure you want to delete category "${cat.name}"?`;

    const ok = await showConfirm(msg, 'Delete Category', { confirmLabel: 'Delete', cancelLabel: 'Cancel' });
    if (!ok) return;

    try {
      await deleteCategory(cat.id);
      toast(`Category "${cat.name}" deleted`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to delete category', 'error');
    }
  };

  const handleResetToDefaults = async () => {
    const ok = await showConfirm(
      'This will restore all default engineering raw material categories. Existing items will remain untouched. Continue?',
      'Reset Categories',
      { confirmLabel: 'Reset Defaults', cancelLabel: 'Cancel' }
    );
    if (!ok) return;

    try {
      await saveCategories(DEFAULT_RAW_MATERIAL_CATEGORIES);
      toast('Restored default material categories', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to reset', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raw Material Categories Manager" size="2xl">
      <div className="p-6 space-y-5 max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-theme-subtle">
          <div>
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Layers className="text-blue-500" size={17} />
              Material Categories & Families
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Manage material classifications, codes, and sub-categories used in inventory, procurement, BOMs, and cutting studio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetToDefaults}
              className="text-[11px] h-8 text-muted hover:text-primary"
              title="Reset to Rex Engineering defaults"
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleOpenAdd}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Add Category
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search categories by name, code, or sub-category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface2/60 border border-theme-subtle rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500/50 text-primary"
          />
        </div>

        {/* Main List Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[300px]">
          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center text-muted text-xs border border-dashed border-theme-subtle rounded-xl">
              <Layers size={32} className="mx-auto mb-2 opacity-30 text-blue-500" />
              <p className="font-semibold text-secondary">No material categories found</p>
              <p className="text-[11px] mt-1">Click "Add Category" above to create your first custom category.</p>
            </div>
          ) : (
            filteredCategories.map(cat => {
              const count = itemCounts[cat.name] || 0;
              return (
                <div 
                  key={cat.id} 
                  className="p-4 bg-surface rounded-xl border border-theme-subtle hover:border-blue-500/40 transition-all flex flex-col gap-2.5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-primary flex items-center gap-1.5">
                        <Tag size={13} className="text-blue-500" />
                        {cat.name}
                      </span>
                      {cat.code && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded">
                          {cat.code}
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-surface2 text-muted rounded-full">
                        {count} item{count === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      {onCategorySelected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onCategorySelected(cat.name);
                            onClose();
                          }}
                          className="h-7 text-[11px] px-2 text-blue-600 hover:bg-blue-500/10 font-medium"
                        >
                          Select
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Edit2}
                        onClick={() => handleOpenEdit(cat)}
                        className="h-7 w-7 p-0 text-muted hover:text-blue-500 hover:bg-blue-500/10"
                        title="Edit Category"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDeleteCategory(cat)}
                        className="h-7 w-7 p-0 text-muted hover:text-rose-500 hover:bg-rose-500/10"
                        title="Delete Category"
                      />
                    </div>
                  </div>

                  {cat.description && (
                    <p className="text-[11px] text-muted leading-relaxed">
                      {cat.description}
                    </p>
                  )}

                  {/* Sub-categories */}
                  {cat.subCategories && cat.subCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-theme-subtle/40">
                      {cat.subCategories.map((sub, sIdx) => (
                        <span 
                          key={sIdx}
                          className="text-[10px] font-medium bg-surface2/70 text-secondary border border-theme-subtle px-2 py-0.5 rounded"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add/Edit Sub-Modal */}
        {isAddingNew && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface border border-theme-subtle rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-theme-subtle">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                  <FolderPlus size={16} className="text-blue-500" />
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Material Category'}
                </h4>
                <button 
                  type="button" 
                  onClick={() => setIsAddingNew(false)}
                  className="p-1 text-muted hover:text-primary rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-secondary">
                      Category Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rubber & Gaskets"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full bg-surface2 border border-theme-subtle rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-secondary">
                      Code / Prefix
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. RUB"
                      value={formCode}
                      onChange={e => setFormCode(e.target.value.toUpperCase())}
                      className="w-full bg-surface2 border border-theme-subtle rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 font-mono text-primary uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-secondary">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of materials in this category..."
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full bg-surface2 border border-theme-subtle rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 text-primary"
                  />
                </div>

                {/* Sub-categories builder */}
                <div className="space-y-2 pt-2 border-t border-theme-subtle/50">
                  <label className="text-[11px] font-semibold text-secondary flex items-center justify-between">
                    <span>Sub-Categories / Material Families</span>
                    <span className="text-[10px] text-muted font-normal">Optional</span>
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Nitrile (NBR), Neoprene, Viton"
                      value={newSubCatInput}
                      onChange={e => setNewSubCatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubCategory();
                        }
                      }}
                      className="flex-1 bg-surface2 border border-theme-subtle rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 text-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSubCategory}
                      className="text-xs px-3"
                    >
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-surface2/40 border border-theme-subtle rounded-lg">
                    {formSubCategories.length === 0 ? (
                      <span className="text-[11px] text-muted italic">No sub-categories added yet</span>
                    ) : (
                      formSubCategories.map((sub, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] bg-surface border border-theme-subtle text-primary px-2 py-0.5 rounded-md"
                        >
                          {sub}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubCategory(sub)}
                            className="text-muted hover:text-rose-500 ml-0.5"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-theme-subtle">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingNew(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {editingCategory ? 'Save Changes' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-theme-subtle text-xs text-muted">
          <span>{categories.length} total categories registered</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

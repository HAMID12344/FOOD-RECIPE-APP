import React, { useMemo, useState } from 'react';
import {
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { MASTER_ADMIN_NAME } from '../firebase';
import {
  adminCreateCustomerRecord,
  adminCreateGlobalRecipe,
  adminDeleteCustomerRecord,
  adminDeleteGlobalRecipe,
  adminToggleGlobalRecipePublished,
  adminUpdateCustomerRecord,
  adminUpdateGlobalRecipe,
  ensureGlobalCatalogSeeded,
} from '../services/firestoreService';
import {
  CustomerProfileRecord,
  CustomerStatus,
  GlobalRecipeRecord,
  KITCHEN_SEGMENTS,
  RecipeRecord,
} from '../types';
import { RecipeFormModal } from './RecipeFormModal';
import { RecipeImage } from './RecipeImage';

interface AdminControlViewProps {
  adminUid: string;
  customers: CustomerProfileRecord[];
  globalRecipes: GlobalRecipeRecord[];
  onNotify: (msg: string) => void;
}

export const AdminControlView: React.FC<AdminControlViewProps> = ({
  adminUid,
  customers,
  globalRecipes,
  onNotify,
}) => {
  const [section, setSection] = useState<'customers' | 'catalog'>('customers');
  const [customerSearch, setCustomerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all');

  // Add / Edit Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfileRecord | null>(null);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custKitchen, setCustKitchen] = useState<string>(KITCHEN_SEGMENTS[0]);
  const [custPhone, setCustPhone] = useState('');
  const [custStatus, setCustStatus] = useState<CustomerStatus>('active');
  const [confirmDeleteCustId, setConfirmDeleteCustId] = useState<string | null>(null);

  // Add / Edit Global Recipe Modal
  const [isGlobalRecipeModalOpen, setIsGlobalRecipeModalOpen] = useState(false);
  const [editingGlobalRecipe, setEditingGlobalRecipe] = useState<GlobalRecipeRecord | null>(null);
  const [confirmDeleteRecipeId, setConfirmDeleteRecipeId] = useState<string | null>(null);

  const nonAdminCustomers = useMemo(
    () => customers.filter((c) => c.role === 'customer'),
    [customers]
  );

  const activeCustomersCount = useMemo(
    () => nonAdminCustomers.filter((c) => c.status === 'active' || c.status === 'vip').length,
    [nonAdminCustomers]
  );

  const publishedGlobalCount = useMemo(
    () => globalRecipes.filter((g) => g.published).length,
    [globalRecipes]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.kitchenType.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [customers, customerSearch, statusFilter]);

  const openAddCustomerModal = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustEmail('');
    setCustKitchen(KITCHEN_SEGMENTS[0]);
    setCustPhone('');
    setCustStatus('active');
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (c: CustomerProfileRecord) => {
    setEditingCustomer(c);
    setCustName(c.name);
    setCustEmail(c.email);
    setCustKitchen(c.kitchenType || KITCHEN_SEGMENTS[0]);
    setCustPhone(c.phone || '');
    setCustStatus(c.status);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custEmail.trim()) return;
    if (editingCustomer) {
      await adminUpdateCustomerRecord(editingCustomer.id, {
        name: custName,
        email: custEmail,
        kitchenType: custKitchen,
        phone: custPhone,
        status: custStatus,
        role: editingCustomer.role,
      });
      onNotify(`Updated customer "${custName}" in Customer Database.`);
    } else {
      await adminCreateCustomerRecord({
        name: custName,
        email: custEmail,
        kitchenType: custKitchen,
        phone: custPhone,
        status: custStatus,
      });
      onNotify(`Added "${custName}" to the Customer Database.`);
    }
    setIsCustomerModalOpen(false);
  };

  const handleQuickStatusChange = async (
    customer: CustomerProfileRecord,
    nextStatus: CustomerStatus
  ) => {
    await adminUpdateCustomerRecord(customer.id, {
      name: customer.name,
      email: customer.email,
      kitchenType: customer.kitchenType,
      phone: customer.phone,
      status: nextStatus,
      role: customer.role,
    });
    onNotify(`Set ${customer.name}'s status to ${nextStatus.toUpperCase()}.`);
  };

  const handleSaveGlobalRecipe = async (payload: {
    title: string;
    category: string;
    categories: string[];
    image_url: string;
    ingredients: string;
    steps: string;
  }) => {
    if (editingGlobalRecipe) {
      await adminUpdateGlobalRecipe(editingGlobalRecipe.id, {
        title: payload.title,
        category: payload.category,
        categories: payload.categories,
        imageUrl: payload.image_url,
        ingredients: payload.ingredients,
        steps: payload.steps,
        published: editingGlobalRecipe.published,
      });
      onNotify(`Updated global recipe "${payload.title}".`);
    } else {
      await adminCreateGlobalRecipe(adminUid, {
        title: payload.title,
        category: payload.category,
        categories: payload.categories,
        imageUrl: payload.image_url,
        ingredients: payload.ingredients,
        steps: payload.steps,
        published: true,
      });
      onNotify(`Published "${payload.title}" to all customer accounts.`);
    }
    setIsGlobalRecipeModalOpen(false);
    setEditingGlobalRecipe(null);
  };

  const editingGlobalAsRecipeRecord: RecipeRecord | null = editingGlobalRecipe
    ? {
        id: editingGlobalRecipe.id,
        ownerId: editingGlobalRecipe.authorId,
        title: editingGlobalRecipe.title,
        category: editingGlobalRecipe.category,
        categories: editingGlobalRecipe.categories,
        image_url: editingGlobalRecipe.imageUrl,
        ingredients: editingGlobalRecipe.ingredients,
        steps: editingGlobalRecipe.steps,
        is_from_api: 0,
        api_meal_id: '',
        isFavorite: false,
      }
    : null;

  return (
    <section className="space-y-6">
      {/* Master Admin Control Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Administrator · {MASTER_ADMIN_NAME}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
            App Control &amp; Customer Database
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Monitor every customer registered in Hamid &amp; Hassan Kitchen, add or update customer
            records, and control global featured recipes across all customer kitchens.
          </p>
        </div>

        {/* Section Switcher */}
        <div className="flex items-center p-1 bg-zinc-200/70 rounded-xl self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setSection('customers')}
            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              section === 'customers'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Customer Database ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('catalog')}
            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              section === 'catalog'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Global App Recipes ({globalRecipes.length})
          </button>
        </div>
      </div>

      {/* Platform KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4">
          <div className="text-xs text-zinc-500">Total Accounts</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 mt-1">
            {customers.length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4">
          <div className="text-xs text-zinc-500">Registered Customers</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {nonAdminCustomers.length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4">
          <div className="text-xs text-zinc-500">Active / VIP Customers</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 mt-1">
            {activeCustomersCount}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4">
          <div className="text-xs text-zinc-500">Published Global Dishes</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 mt-1">
            {publishedGlobalCount}
          </div>
        </div>
      </div>

      {section === 'customers' ? (
        /* SECTION 1: CUSTOMER DATABASE MANAGEMENT */
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by name, email, phone, or hostel..."
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-1 bg-zinc-100 rounded-xl">
                {(['all', 'active', 'vip', 'suspended'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium uppercase transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={openAddCustomerModal}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-x-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Users className="w-7 h-7 text-zinc-400 mx-auto" />
                <p className="text-sm font-medium text-zinc-900">
                  No customer records match your filter
                </p>
                <p className="text-xs text-zinc-500">
                  Customers who sign up appear here automatically in real time, or click &ldquo;Add
                  Customer&rdquo; above.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[780px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold text-zinc-600">
                    <th className="py-3.5 px-4">Customer / Account</th>
                    <th className="py-3.5 px-4">Kitchen Segment</th>
                    <th className="py-3.5 px-4">Phone / Note</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status Control</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {filteredCustomers.map((c) => {
                    const isSelfAdmin = c.role === 'admin';
                    return (
                      <tr key={c.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-900">{c.name}</div>
                          <div className="text-xs text-zinc-500">{c.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-700">{c.kitchenType}</td>
                        <td className="py-3.5 px-4 text-xs text-zinc-500">
                          {c.phone || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-zinc-700">
                          {isSelfAdmin ? 'Master Admin' : 'Customer'}
                        </td>
                        <td className="py-3.5 px-4">
                          {isSelfAdmin ? (
                            <span className="text-xs font-semibold text-emerald-700">
                              Owner · Active
                            </span>
                          ) : (
                            <select
                              value={c.status}
                              onChange={(e) =>
                                handleQuickStatusChange(c, e.target.value as CustomerStatus)
                              }
                              aria-label={`Status for ${c.name}`}
                              className="min-h-[36px] px-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:border-emerald-700"
                            >
                              <option value="active">Active</option>
                              <option value="vip">VIP</option>
                              <option value="suspended">Suspended</option>
                              <option value="archived">Archived</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditCustomerModal(c)}
                              className="min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-xs font-medium text-zinc-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {!isSelfAdmin && confirmDeleteCustId !== c.id && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCustId(c.id)}
                                aria-label={`Delete ${c.name}`}
                                className="min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-200 hover:border-red-200 hover:bg-red-50 text-xs font-medium text-red-700 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {!isSelfAdmin && confirmDeleteCustId === c.id && (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await adminDeleteCustomerRecord(c.id);
                                    setConfirmDeleteCustId(null);
                                    onNotify(`Removed "${c.name}" from Customer Database.`);
                                  }}
                                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCustId(null)}
                                  className="min-h-[34px] px-2 py-1 rounded-lg bg-zinc-200 text-zinc-700 text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* SECTION 2: GLOBAL APP RECIPES CONTROL */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600">
              Published dishes here appear immediately in every signed-in customer&apos;s app.
            </p>

            <div className="flex items-center gap-2.5">
              {globalRecipes.length === 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const count = await ensureGlobalCatalogSeeded(adminUid);
                    onNotify(`Published ${count} signature dishes to Global Catalog.`);
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Seed 9 Signature Dishes</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingGlobalRecipe(null);
                  setIsGlobalRecipeModalOpen(true);
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Global Dish</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {globalRecipes.map((dish) => (
              <article
                key={dish.id}
                className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
                  <RecipeImage src={dish.imageUrl} alt={dish.title} className="w-full h-full" />
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">
                      {dish.category} · {dish.published ? 'Visible to All Customers' : 'Hidden Draft'}
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 line-clamp-2">
                      {dish.title}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await adminToggleGlobalRecipePublished(dish.id, !dish.published);
                        onNotify(
                          !dish.published
                            ? `"${dish.title}" is now visible to all customers.`
                            : `"${dish.title}" hidden from customer catalog.`
                        );
                      }}
                      className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        dish.published
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {dish.published ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Published</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGlobalRecipe(dish);
                          setIsGlobalRecipeModalOpen(true);
                        }}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-700 cursor-pointer"
                      >
                        Edit
                      </button>

                      {confirmDeleteRecipeId !== dish.id ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRecipeId(dish.id)}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:border-red-200 hover:bg-red-50 text-xs font-medium text-red-700 cursor-pointer"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            await adminDeleteGlobalRecipe(dish.id);
                            setConfirmDeleteRecipeId(null);
                            onNotify(`Deleted global dish "${dish.title}".`);
                          }}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Record Modal */}
      {isCustomerModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsCustomerModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Customer Database Record"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-zinc-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editingCustomer ? 'Edit Customer Record' : 'Add Customer to Database'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="min-w-[42px] min-h-[42px] rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Customer Full Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Usman Farooq"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Customer Email
                </label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="usman@bahria.edu.pk"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Kitchen Segment
                  </label>
                  <select
                    value={custKitchen}
                    onChange={(e) => setCustKitchen(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
                  >
                    {KITCHEN_SEGMENTS.map((seg) => (
                      <option key={seg} value={seg}>
                        {seg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={custStatus}
                    onChange={(e) => setCustStatus(e.target.value as CustomerStatus)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
                  >
                    <option value="active">Active</option>
                    <option value="vip">VIP</option>
                    <option value="suspended">Suspended</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Phone / Hostel Note
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="e.g. +92 300 0000000 · H-11 Campus"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                >
                  {editingCustomer ? 'Save Customer' : 'Add to Customer Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Recipe Create / Edit Modal */}
      {isGlobalRecipeModalOpen && (
        <RecipeFormModal
          initialRecipe={editingGlobalAsRecipeRecord}
          onClose={() => {
            setIsGlobalRecipeModalOpen(false);
            setEditingGlobalRecipe(null);
          }}
          onSave={handleSaveGlobalRecipe}
        />
      )}
    </section>
  );
};

import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';
import { CustomerProfileRecord, KITCHEN_SEGMENTS, ScreenTab } from '../types';

interface ProfileViewProps {
  profile: CustomerProfileRecord;
  totalCustomersCount?: number;
  globalRecipesCount?: number;
  stats: {
    recipesCount: number;
    favoritesCount: number;
    plannedCount: number;
    pendingGroceriesCount: number;
  };
  onSaveProfile: (updates: { name: string; kitchenType: string; phone: string }) => Promise<void>;
  onNavigateTab: (tab: ScreenTab) => void;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  totalCustomersCount = 0,
  globalRecipesCount = 0,
  stats,
  onSaveProfile,
  onNavigateTab,
  onLogout,
  onNotify,
}) => {
  const [name, setName] = useState(profile.name);
  const [kitchenType, setKitchenType] = useState(profile.kitchenType || KITCHEN_SEGMENTS[0]);
  const [phone, setPhone] = useState(profile.phone || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setKitchenType(profile.kitchenType || KITCHEN_SEGMENTS[0]);
    setPhone(profile.phone || '');
  }, [profile.name, profile.kitchenType, profile.phone]);

  const isAdmin = profile.role === 'admin';

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile({ name, kitchenType, phone });
      onNotify('Profile saved to database.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto space-y-8">
      {/* Primary Profile-First Identity Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border flex flex-col md:flex-row md:items-center justify-between gap-6 ${
          isAdmin
            ? 'bg-zinc-900 border-zinc-800 text-white'
            : 'bg-white border-zinc-200/90 text-zinc-900'
        }`}
      >
        <div className="space-y-2">
          <div
            className={`flex items-center gap-2 text-xs font-medium ${
              isAdmin ? 'text-emerald-300' : 'text-zinc-500'
            }`}
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Master Application Administrator · Full Control</span>
              </>
            ) : (
              <span>
                Registered Customer · {profile.kitchenType} · Status: {profile.status.toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight">{profile.name}</h1>

          <div
            className={`text-xs sm:text-sm ${isAdmin ? 'text-zinc-300' : 'text-zinc-500'}`}
          >
            {profile.email}
            {profile.phone ? ` · ${profile.phone}` : ''}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigateTab(ScreenTab.Admin)}
              className="m3-ripple min-h-[46px] px-5 py-2.5 rounded-full bg-[#006b58] hover:bg-[#005546] text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Open Admin Control &amp; Customer DB</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className={`m3-ripple min-h-[46px] px-5 py-2.5 rounded-full border text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              isAdmin
                ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'border-red-200 bg-red-50/70 hover:bg-red-100 text-red-800'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Suspended Account Notice (if Admin Hamid Ali paused a customer) */}
      {profile.status === 'suspended' && !isAdmin && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          Your customer account is currently marked as <strong>Suspended</strong> by Administrator
          Hamid Ali. You can view saved items, while new writes are paused until reactivated.
        </div>
      )}

      {/* Key Metrics Row (Tabular Numerals) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isAdmin ? (
          <>
            <button
              type="button"
              onClick={() => onNavigateTab(ScreenTab.Admin)}
              className="bg-white rounded-2xl border border-zinc-200/80 hover:border-emerald-700 p-5 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs text-zinc-500">Customer Database</div>
              <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
                {totalCustomersCount}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">Manage accounts →</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab(ScreenTab.Admin)}
              className="bg-white rounded-2xl border border-zinc-200/80 hover:border-emerald-700 p-5 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs text-zinc-500">Global App Dishes</div>
              <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 mt-1">
                {globalRecipesCount}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">Control catalog →</div>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onNavigateTab(ScreenTab.Home)}
              className="bg-white rounded-2xl border border-zinc-200/80 hover:border-emerald-700 p-5 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs text-zinc-500">My Saved Recipes</div>
              <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 mt-1">
                {stats.recipesCount}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">Open recipe box →</div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab(ScreenTab.Favorites)}
              className="bg-white rounded-2xl border border-zinc-200/80 hover:border-emerald-700 p-5 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs text-zinc-500">Favorites</div>
              <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 mt-1">
                {stats.favoritesCount}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">View bookmarked →</div>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onNavigateTab(ScreenTab.Planner)}
          className="bg-white rounded-2xl border border-zinc-200/80 hover:border-emerald-700 p-5 text-left transition-colors cursor-pointer"
        >
          <div className="text-xs text-zinc-500">Planned Weekly Meals</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 mt-1">
            {stats.plannedCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Open planner →</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab(ScreenTab.Groceries)}
          className="bg-white rounded-2xl border border-zinc-200/80 hover:border-emerald-700 p-5 text-left transition-colors cursor-pointer"
        >
          <div className="text-xs text-zinc-500">Pending Groceries</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {stats.pendingGroceriesCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Snap or check off →</div>
        </button>
      </div>

      {/* Quick Workspace Launchers & Editable Profile Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleUpdateDetails}
          className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200/80 p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-zinc-900 font-semibold text-base">
            <UserCheck className="w-4 h-4 text-emerald-700" />
            <h2>Profile &amp; Kitchen Preferences</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="profile-name"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label
                htmlFor="profile-segment"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Kitchen Segment
              </label>
              <select
                id="profile-segment"
                value={kitchenType}
                onChange={(e) => setKitchenType(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
              >
                {isAdmin && <option value="Master App Control">Master App Control</option>}
                {KITCHEN_SEGMENTS.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Phone / Hostel Location Note
              </label>
              <input
                id="profile-phone"
                type="text"
                maxLength={40}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. Islamabad Campus"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-500">
              Synced live with Firestore Customer Database
            </span>
            <button
              type="submit"
              disabled={saving}
              className="m3-ripple min-h-[44px] px-6 py-2 rounded-full bg-[#006b58] hover:bg-[#005546] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {saving ? 'Saving…' : 'Update Profile'}
            </button>
          </div>
        </form>

        {/* Right Quick Navigation Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200/80 p-6 space-y-4">
          <h2 className="text-base font-semibold text-zinc-900">Jump Into Kitchen Tools</h2>
          <div className="divide-y divide-zinc-100">
            <button
              type="button"
              onClick={() => onNavigateTab(ScreenTab.Home)}
              className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-emerald-700">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Recipes &amp; Featured Catalog</div>
                  <div className="text-xs text-zinc-500">
                    Browse curated dishes and personal recipes
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab(ScreenTab.Planner)}
              className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-emerald-700">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Weekly Meal Planner</div>
                  <div className="text-xs text-zinc-500">
                    Schedule Monday–Sunday Breakfast, Lunch &amp; Dinner
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab(ScreenTab.Groceries)}
              className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-emerald-700">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    Grocery List &amp; Snap to Add
                  </div>
                  <div className="text-xs text-zinc-500">
                    Scan ingredients with Groq Vision camera
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowLeft, ArrowRight, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { CULINARY_ASSETS, PRESET_RECIPE_IMAGES } from '../assets/culinaryAssets';
import { MASTER_ADMIN_EMAIL, MASTER_ADMIN_NAME, auth, googleProvider } from '../firebase';
import { KITCHEN_SEGMENTS } from '../types';
import { RecipeImage } from './RecipeImage';

export interface PendingCustomerOnboarding {
  customName?: string;
  kitchenType?: string;
  phone?: string;
}

interface AuthScreenProps {
  onBeforeSignIn: (onboarding?: PendingCustomerOnboarding) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onBeforeSignIn }) => {
  // Page 1 shows ONLY "Log In" or "Sign Up". Page 2 shows the selected action + the Admin button.
  const [page, setPage] = useState<1 | 2>(1);
  const [flow, setFlow] = useState<'login' | 'signup'>('login');

  const [customName, setCustomName] = useState('');
  const [kitchenType, setKitchenType] = useState<string>(KITCHEN_SEGMENTS[0]);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeAuthTarget, setActiveAuthTarget] = useState<'customer' | 'admin' | null>(null);

  const handleGoogleAuth = async (targetRole: 'customer' | 'admin', e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setActiveAuthTarget(targetRole);

    try {
      if (targetRole === 'customer' && flow === 'signup') {
        onBeforeSignIn({
          customName: customName.trim() || undefined,
          kitchenType,
          phone: phone.trim(),
        });
      } else {
        onBeforeSignIn(undefined);
      }

      const cred = await signInWithPopup(auth, googleProvider);
      if (
        targetRole === 'admin' &&
        cred.user.email?.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase()
      ) {
        setError(
          `Signed in as ${cred.user.email} (Customer account). Master Admin Control belongs exclusively to ${MASTER_ADMIN_NAME} (${MASTER_ADMIN_EMAIL}).`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in was canceled or interrupted.';
      if (!msg.includes('popup-closed-by-user')) {
        setError(msg);
      }
    } finally {
      setActiveAuthTarget(null);
    }
  };

  const openPageTwo = (chosenFlow: 'login' | 'signup') => {
    setFlow(chosenFlow);
    setError(null);
    setPage(2);
  };

  const isLoading = activeAuthTarget !== null;

  return (
    <div className="min-h-screen bg-[#f5faf8] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto bg-white rounded-[28px] border border-[#bfc9c4]/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left Editorial Culinary Showcase */}
        <div className="relative lg:col-span-6 min-h-[280px] lg:min-h-[580px] flex flex-col justify-end overflow-hidden">
          <RecipeImage
            src={CULINARY_ASSETS.sindhiBiryani}
            alt="Authentic Pakistani chicken biryani in a traditional ceramic handi"
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
          <div className="relative z-10 p-6 sm:p-8 lg:p-10 text-white space-y-4">
            <div>
              <p className="text-xs font-medium text-emerald-300 tracking-wide mb-2">
                Hamid &amp; Hassan Kitchen · Recipe &amp; Meal Planner
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight mb-2.5">
                Your recipes, weekly meals, and smart grocery list in one place.
              </h1>
              <p className="text-sm text-zinc-200 leading-relaxed max-w-md">
                Save personal and curated dishes, plan Monday through Sunday meals, and scan
                fresh ingredients straight into your grocery checklist.
              </p>
            </div>

            <div className="pt-2">
              <p className="text-[11px] text-zinc-300 mb-2">Featured kitchen favorites:</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_RECIPE_IMAGES.slice(1, 5).map((item) => (
                  <div
                    key={item.label}
                    className="aspect-[4/3] rounded-xl overflow-hidden border border-white/25 bg-zinc-800"
                    title={item.label}
                  >
                    <RecipeImage src={item.url} alt={item.label} className="w-full h-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Two-Page Entry Portal */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          {page === 1 ? (
            /* PAGE 1: ONLY Log In or Sign Up buttons */
            <div className="max-w-md w-full mx-auto space-y-8">
              <div className="space-y-2">
                <span className="font-editorial text-2xl font-semibold text-zinc-900 tracking-tight block">
                  Hamid &amp; Hassan Kitchen
                </span>
                <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900">
                  Welcome to your kitchen hub
                </h2>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Choose Log In to open your existing account or Sign Up to register a new kitchen
                  profile.
                </p>
              </div>

              <div className="space-y-3.5">
                <button
                  type="button"
                  onClick={() => openPageTwo('login')}
                  className="m3-ripple w-full min-h-[52px] px-6 py-3 rounded-full bg-[#006b58] hover:bg-[#005546] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => openPageTwo('signup')}
                  className="m3-ripple w-full min-h-[52px] px-6 py-3 rounded-full bg-white hover:bg-[#eff5f2] border border-[#6f7975] text-[#006b58] text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* PAGE 2: Selected Customer Flow + Dedicated Admin Button */
            <div className="max-w-md w-full mx-auto space-y-5">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setError(null);
                  }}
                  className="min-h-[40px] pr-3 text-xs font-semibold text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFlow(flow === 'login' ? 'signup' : 'login');
                    setError(null);
                  }}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap"
                >
                  {flow === 'login' ? 'Need an account? Sign Up' : 'Have an account? Log In'}
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-800 leading-relaxed"
                >
                  {error}
                </div>
              )}

              {flow === 'login' ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">Customer Log In</h2>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Continue with Google to open your Profile first and sync your saved recipes,
                      weekly meal plan, and grocery list.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 border border-zinc-200/80 p-4 flex items-start gap-3">
                    <Users className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Sign in with your registered Google account to access your personal kitchen
                      workspace.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGoogleAuth('customer')}
                    disabled={isLoading}
                    className="m3-ripple w-full min-h-[48px] px-5 py-2.5 rounded-full bg-[#006b58] hover:bg-[#005546] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>
                      {activeAuthTarget === 'customer'
                        ? 'Signing In…'
                        : 'Continue as Customer with Google'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => handleGoogleAuth('customer', e)}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">Customer Sign Up</h2>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Complete your kitchen details below to add your profile directly to the
                      Customer Database.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 border border-zinc-200/80 p-3.5 flex items-start gap-3">
                    <UserPlus className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-zinc-600 leading-relaxed">
                      New customer accounts open on <strong className="text-zinc-900">Profile</strong>{' '}
                      first with starter recipes ready to plan.
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-medium text-zinc-700 mb-1.5"
                    >
                      Customer Full Name (optional — defaults to Google name)
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      maxLength={100}
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Bilal Ahmed"
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-kitchen"
                        className="block text-xs font-medium text-zinc-700 mb-1.5"
                      >
                        Kitchen Segment
                      </label>
                      <select
                        id="signup-kitchen"
                        value={kitchenType}
                        onChange={(e) => setKitchenType(e.target.value)}
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
                      <label
                        htmlFor="signup-phone"
                        className="block text-xs font-medium text-zinc-700 mb-1.5"
                      >
                        Phone / Campus Note (optional)
                      </label>
                      <input
                        id="signup-phone"
                        type="text"
                        maxLength={40}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. E-8 Hostel Islamabad"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="m3-ripple w-full min-h-[48px] px-5 py-2.5 rounded-full bg-[#006b58] hover:bg-[#005546] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>
                      {activeAuthTarget === 'customer'
                        ? 'Registering Customer…'
                        : 'Sign Up with Google'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Administrator Access Section — Only on Page 2 */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Administrator Control</span>
                  <span>{MASTER_ADMIN_NAME}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleGoogleAuth('admin')}
                  disabled={isLoading}
                  className="m3-ripple w-full min-h-[48px] px-5 py-2.5 rounded-full bg-[#cde8df] hover:bg-[#bce0d4] disabled:opacity-60 text-[#07201a] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4 text-[#006b58] shrink-0" />
                  <span>
                    {activeAuthTarget === 'admin'
                      ? 'Verifying Admin Identity…'
                      : `Admin Login (${MASTER_ADMIN_NAME})`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

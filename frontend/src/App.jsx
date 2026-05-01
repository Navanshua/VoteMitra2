import { useState, useEffect } from 'react';
import { onAuthChange, getIdToken, handleRedirectResult } from './gcp/auth';
import { getProfile } from './utils/pincode';

// Modular Imports (Maintaining your structure)
import AuthButton from './components/AuthButton';
import PincodeAgent from './components/PincodeAgent';
import DashboardHeader from './components/DashboardHeader';
import NewsCard from './components/NewsCard';
import CandidateCard from './components/CandidateCard';
import FormsWizard from './components/FormsWizard';
import BoothNavigator from './components/BoothNavigator';

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [language, setLanguage] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    /**
     * Resolves the user into the right screen (dashboard / onboarding).
     * Extracted so both the redirect result AND onAuthStateChanged can share it.
     */
    async function resolveUser(firebaseUser) {
      if (cancelled) return;
      setUser(firebaseUser);

      try {
        const token = await firebaseUser.getIdToken(true);
        const prof = await getProfile(token);

        if (!cancelled) {
          if (prof && prof.state) {
            setProfile(prof);
            setLanguage(prof.language || 'en');
            setScreen('dashboard');
          } else {
            setScreen('onboarding');
          }
        }
      } catch (error) {
        console.warn("⚠️ Profile not found or backend down, moving to onboarding.");
        if (!cancelled) setScreen('onboarding');
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    const startApp = async () => {
      // 1. First, check if this page load is a redirect-result from Google OAuth.
      //    This must complete BEFORE we trust onAuthStateChanged's initial null.
      let redirectUser = null;
      try {
        const result = await handleRedirectResult();
        if (result?.user) {
          redirectUser = result.user;
          console.log("✅ Auth redirect resolved with user:", redirectUser.email);
        }
      } catch (err) {
        console.error("❌ Auth redirect error:", err);
      }

      // 2. If redirect gave us a user, resolve them immediately
      //    (no need to wait for onAuthStateChanged to fire)
      if (redirectUser) {
        await resolveUser(redirectUser);
      }

      // 3. Now subscribe to auth state changes for ongoing session management
      //    (login/logout after initial load, token refresh, etc.)
      unsub = onAuthChange(async (firebaseUser) => {
        if (cancelled) return;

        if (!firebaseUser) {
          // Only show auth screen if we did NOT just resolve a redirect user.
          // This prevents the brief null→user flash during redirect processing.
          if (!redirectUser) {
            setUser(null);
            setProfile(null);
            setScreen('auth');
            setReady(true);
          }
          return;
        }

        // If onAuthStateChanged fires with the same user we already resolved
        // from redirect, skip re-processing to avoid duplicate work.
        if (redirectUser && firebaseUser.uid === redirectUser.uid) {
          redirectUser = null; // Clear flag so future auth changes are processed
          return;
        }

        await resolveUser(firebaseUser);
      });
    };

    startApp();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  // --- RENDER LOGIC ---

  if (!ready || screen === 'loading') {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-spin">🪄</div>
          <p className="text-textMuted text-sm font-medium tracking-widest uppercase">Initializing VoterMitra...</p>
        </div>
      </div>
    );
  }

  if (screen === 'auth') {
    return <AuthGate />;
  }

  if (screen === 'onboarding') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-navy px-4">
        <div className="w-full max-w-lg space-y-6 text-center">
          <h1 className="text-3xl font-bold text-primary">Almost there!</h1>
          <p className="text-textMuted text-sm">Welcome, {user?.displayName}. Tell Mitra your location.</p>
          <PincodeAgent user={user} onPersonalize={(data) => { setProfile(data); setScreen('dashboard'); }} />
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      user={user}
      profile={profile}
      language={language}
      onLanguageChange={setLanguage}
      onLogout={() => { setUser(null); setProfile(null); setScreen('auth'); }}
    />
  );
}

// --- Local Helper Components (To keep App.jsx clean while following your structure) ---

function AuthGate() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-navy">
      <div className="card w-full max-w-sm p-10 space-y-8 text-center fade-in-up">
        <div className="space-y-3">
          <div className="text-6xl animate-bounce">🇮🇳</div>
          <h1 className="font-heading text-5xl font-bold text-primary">VoterMitra</h1>
          <p className="text-textMuted text-sm">Your hyper-local election guide.</p>
        </div>
        <AuthButton />
      </div>
    </div>
  );
}

function Dashboard({ user, profile, language, onLanguageChange, onLogout }) {
  return (
    <div className="min-h-screen bg-navy">
      <DashboardHeader
        profile={profile}
        user={user}
        language={language}
        onLanguageChange={onLanguageChange}
        onLogout={onLogout}
      />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <NewsCard district={profile.district} state={profile.state} language={language} />
        <CandidateCard acName={profile.ac_name} state={profile.state} language={language} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <FormsWizard language={language} />
          <BoothNavigator language={language} />
        </div>
      </main>
    </div>
  );
}
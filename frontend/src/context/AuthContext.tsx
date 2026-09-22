import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  hashAadhaarNumber,
  INDIAN_STATES,
  type PatientProfile,
  type PatientRegistrationInput,
} from '../services/supabase';

interface AuthContextType {
  user: User | null;
  profile: PatientProfile | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: PatientRegistrationInput) => Promise<{ success: boolean; profile?: PatientProfile; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_SESSION_KEY = 'health_wallet_v2_mock_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch patient profile from Supabase database
  const fetchPatientProfile = async (userId: string): Promise<PatientProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch patient profile from Supabase:', error.message);
        return null;
      }
      return data as PatientProfile;
    } catch (err) {
      console.warn('Network error fetching profile:', err);
      return null;
    }
  };

  // Initial session restoration on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (isMounted) {
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            if (initialSession?.user) {
              const p = await fetchPatientProfile(initialSession.user.id);
              if (isMounted) setProfile(p);
            }
          }
        } catch (err) {
          console.warn('Error reading Supabase session:', err);
        }
      } else {
        // Fallback demo session from localStorage for testing when Supabase env is pending
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
          if (stored && isMounted) {
            const parsed = JSON.parse(stored);
            setProfile(parsed.profile);
            setUser(parsed.user);
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for Supabase auth state changes
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const p = await fetchPatientProfile(newSession.user.id);
          if (isMounted) setProfile(p);
        } else {
          if (isMounted) setProfile(null);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // 1. LOGIN
  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) return { success: false, error: 'Please enter your Username or Mobile Number.' };
    if (!password) return { success: false, error: 'Please enter your password.' };

    if (!isSupabaseConfigured) {
      // Fallback demo simulation when credentials are not yet entered
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          (parsed.profile.username.toLowerCase() === cleanId.toLowerCase() ||
            parsed.profile.mobile_number === cleanId) &&
          password.length >= 6
        ) {
          setProfile(parsed.profile);
          setUser(parsed.user);
          return { success: true };
        }
      }

      // Allow pre-seeded demo user
      if (cleanId.toLowerCase() === 'sunita_patil' || cleanId === '9845122334') {
        const demoProfile: PatientProfile = {
          id: 'demo-uuid-1',
          user_id: 'demo-user-1',
          health_wallet_id: 'HW-TN-38236621',
          patient_name: 'Sunita Patil',
          mobile_number: '9845122334',
          aadhaar_hash: '556677889901hash',
          aadhaar_last_four: '9901',
          blood_group: 'B+',
          gender: 'Female',
          state: 'Tamil Nadu',
          state_code: 'TN',
          username: 'sunita_patil',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(demoProfile);
        setUser({ id: 'demo-user-1', email: 'sunita_patil@patient.healthwallet.local' } as User);
        localStorage.setItem(
          LOCAL_STORAGE_SESSION_KEY,
          JSON.stringify({
            user: { id: 'demo-user-1', email: 'sunita_patil@patient.healthwallet.local' },
            profile: demoProfile,
          })
        );
        return { success: true };
      }

      return {
        success: false,
        error:
          'Supabase credentials are not yet configured in .env. Use username "sunita_patil" or register a new patient account to test.',
      };
    }

    try {
      // Determine auth email: resolve mobile or username
      let authEmail = '';
      const isMobile = /^[6-9]\d{9}$/.test(cleanId);

      if (isMobile) {
        // Query database for username matching this mobile
        const { data: profileMatch, error: lookupError } = await supabase
          .from('patient_profiles')
          .select('username')
          .eq('mobile_number', cleanId)
          .maybeSingle();

        if (lookupError || !profileMatch?.username) {
          return {
            success: false,
            error: 'No patient account found with this mobile number. Please register first.',
          };
        }
        authEmail = `${profileMatch.username.toLowerCase()}@patient.healthwallet.local`;
      } else {
        authEmail = `${cleanId.toLowerCase()}@patient.healthwallet.local`;
      }

      // Supabase Auth verification
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: 'Invalid credentials. Please verify your username and password.',
        };
      }

      // Fetch patient profile
      const patientData = await fetchPatientProfile(authData.user.id);
      if (!patientData) {
        return {
          success: false,
          error: 'Patient profile record not found. Please contact support.',
        };
      }

      setSession(authData.session);
      setUser(authData.user);
      setProfile(patientData);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error occurred during sign in. Please try again.',
      };
    }
  };

  // 2. PATIENT REGISTRATION
  const register = async (
    input: PatientRegistrationInput
  ): Promise<{ success: boolean; profile?: PatientProfile; error?: string }> => {
    // Normalizations & validations
    const cleanName = input.patientName.trim();
    const cleanMobile = input.mobileNumber.replace(/\D/g, '');
    const cleanAadhaar = input.aadhaarNumber.replace(/\D/g, '');
    const cleanUsername = input.username.trim().toLowerCase();
    const password = input.password;

    if (!cleanName) return { success: false, error: 'Patient name is required.' };
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return { success: false, error: 'Enter a valid 10-digit Indian mobile number.' };
    }
    if (cleanAadhaar.length !== 12) {
      return { success: false, error: 'Aadhaar number must be exactly 12 digits.' };
    }
    if (cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const stateObj = INDIAN_STATES.find((s) => s.name === input.stateName) || INDIAN_STATES[0];
    const stateCode = stateObj.code;
    const aadhaarLastFour = cleanAadhaar.slice(-4);
    const aadhaarHash = await hashAadhaarNumber(cleanAadhaar);
    const authEmail = `${cleanUsername}@patient.healthwallet.local`;

    if (!isSupabaseConfigured) {
      // Offline/local testing simulation when Supabase credentials are pending
      const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
      const generatedHwId = `HW-${stateCode}-${randomDigits}`;

      const newProfile: PatientProfile = {
        id: `mock-${Date.now()}`,
        user_id: `mock-user-${Date.now()}`,
        health_wallet_id: generatedHwId,
        patient_name: cleanName,
        mobile_number: cleanMobile,
        aadhaar_hash: aadhaarHash,
        aadhaar_last_four: aadhaarLastFour,
        blood_group: input.bloodGroup,
        gender: input.gender,
        state: input.stateName,
        state_code: stateCode,
        username: cleanUsername,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(
        LOCAL_STORAGE_SESSION_KEY,
        JSON.stringify({
          user: { id: newProfile.user_id, email: authEmail },
          profile: newProfile,
        })
      );

      return { success: true, profile: newProfile };
    }

    try {
      // 1. Check uniqueness for username and mobile
      const { data: existingUser } = await supabase
        .from('patient_profiles')
        .select('id, username, mobile_number')
        .or(`username.eq.${cleanUsername},mobile_number.eq.${cleanMobile}`)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.username?.toLowerCase() === cleanUsername) {
          return { success: false, error: 'This username is already registered. Please choose another.' };
        }
        if (existingUser.mobile_number === cleanMobile) {
          return { success: false, error: 'This mobile number is already linked to an existing Health Wallet.' };
        }
      }

      // 2. Call Supabase Auth signUp
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            patient_name: cleanName,
            mobile_number: cleanMobile,
          },
        },
      });

      if (signUpError || !authData.user) {
        return {
          success: false,
          error: signUpError?.message || 'Failed to create user authentication account.',
        };
      }

      // 3. Insert into patient_profiles table
      // Note: The database trigger 'trg_assign_health_wallet_id' automatically sets the authoritative HW-[STATE]-[8 DIGITS]
      const { data: insertedProfile, error: insertError } = await supabase
        .from('patient_profiles')
        .insert({
          user_id: authData.user.id,
          patient_name: cleanName,
          mobile_number: cleanMobile,
          aadhaar_hash: aadhaarHash,
          aadhaar_last_four: aadhaarLastFour,
          blood_group: input.bloodGroup,
          gender: input.gender,
          state: input.stateName,
          state_code: stateCode,
          username: cleanUsername,
        })
        .select('*')
        .single();

      if (insertError || !insertedProfile) {
        return {
          success: false,
          error: insertError?.message || 'Failed to save patient profile to database.',
        };
      }

      return { success: true, profile: insertedProfile as PatientProfile };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Unexpected error during patient registration.',
      };
    }
  };

  // 3. LOGOUT
  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error signing out:', err);
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

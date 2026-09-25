import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  hashAadhaarNumber,
  INDIAN_STATES,
  type PatientProfile,
  type PatientRegistrationInput,
  type DoctorProfile,
  type DoctorRegistrationInput,
} from '../services/supabase';
import { DEMO_DOCTOR_PROFILE } from '../services/doctors';

export type UserRole = 'PATIENT' | 'DOCTOR';

interface AuthContextType {
  user: User | null;
  profile: PatientProfile | null;
  patientProfile: PatientProfile | null;
  doctorProfile: DoctorProfile | null;
  role: UserRole | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  login: (
    identifier: string,
    password: string,
    rolePreference?: UserRole
  ) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  register: (
    data: PatientRegistrationInput
  ) => Promise<{ success: boolean; profile?: PatientProfile; error?: string }>;
  registerDoctor: (
    data: DoctorRegistrationInput
  ) => Promise<{ success: boolean; profile?: DoctorProfile; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_SESSION_KEY = 'health_wallet_v2_mock_session';
const LOCAL_STORAGE_DOCTOR_SESSION_KEY = 'health_wallet_v2_doctor_mock_session';
const LOCAL_STORAGE_ROLE_KEY = 'health_wallet_v2_active_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch doctor profile from Supabase
  const fetchDoctorProfile = async (userId: string): Promise<DoctorProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch doctor profile:', error.message);
        return null;
      }
      return data as DoctorProfile;
    } catch (err) {
      console.warn('Network error fetching doctor profile:', err);
      return null;
    }
  };

  // Fetch patient profile from Supabase
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

  // Resolve user role and corresponding profile
  const resolveUserRoleAndProfile = async (
    userId: string,
    roleHint?: UserRole
  ): Promise<{ role: UserRole | null; patient: PatientProfile | null; doctor: DoctorProfile | null }> => {
    if (roleHint === 'DOCTOR') {
      const doc = await fetchDoctorProfile(userId);
      if (doc) return { role: 'DOCTOR', patient: null, doctor: doc };
    }

    if (roleHint === 'PATIENT') {
      const pat = await fetchPatientProfile(userId);
      if (pat) return { role: 'PATIENT', patient: pat, doctor: null };
    }

    // Check doctor first, then patient
    const doc = await fetchDoctorProfile(userId);
    if (doc) {
      return { role: 'DOCTOR', patient: null, doctor: doc };
    }

    const pat = await fetchPatientProfile(userId);
    if (pat) {
      return { role: 'PATIENT', patient: pat, doctor: null };
    }

    return { role: null, patient: null, doctor: null };
  };

  // Initial session restoration on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (isSupabaseConfigured) {
        try {
          const {
            data: { session: initialSession },
          } = await supabase.auth.getSession();
          if (isMounted) {
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            if (initialSession?.user) {
              const { role: detectedRole, patient, doctor } = await resolveUserRoleAndProfile(
                initialSession.user.id
              );
              if (isMounted) {
                setRole(detectedRole);
                setProfile(patient);
                setDoctorProfile(doctor);
              }
            }
          }
        } catch (err) {
          console.warn('Error reading Supabase session:', err);
        }
      } else {
        // Fallback demo session from localStorage for testing when Supabase env is pending
        try {
          const activeRole = localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole | null;
          if (activeRole === 'DOCTOR') {
            const docStored = localStorage.getItem(LOCAL_STORAGE_DOCTOR_SESSION_KEY);
            if (docStored && isMounted) {
              const parsed = JSON.parse(docStored);
              setDoctorProfile(parsed.profile);
              setUser(parsed.user);
              setRole('DOCTOR');
              setProfile(null);
            }
          } else {
            const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
            if (stored && isMounted) {
              const parsed = JSON.parse(stored);
              setProfile(parsed.profile);
              setUser(parsed.user);
              setRole('PATIENT');
              setDoctorProfile(null);
            }
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
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const { role: detectedRole, patient, doctor } = await resolveUserRoleAndProfile(
            newSession.user.id
          );
          if (isMounted) {
            setRole(detectedRole);
            setProfile(patient);
            setDoctorProfile(doctor);
          }
        } else {
          if (isMounted) {
            setRole(null);
            setProfile(null);
            setDoctorProfile(null);
          }
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

  // 1. LOGIN (Supports role preference: PATIENT or DOCTOR)
  const login = async (
    identifier: string,
    password: string,
    rolePreference: UserRole = 'PATIENT'
  ): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) return { success: false, error: 'Please enter your Username or Mobile Number.' };
    if (!password) return { success: false, error: 'Please enter your password.' };

    if (!isSupabaseConfigured) {
      // Demo / offline fallback simulation
      if (rolePreference === 'DOCTOR') {
        const storedDoc = localStorage.getItem(LOCAL_STORAGE_DOCTOR_SESSION_KEY);
        if (storedDoc) {
          try {
            const parsed = JSON.parse(storedDoc);
            if (
              (parsed.profile.username.toLowerCase() === cleanId.toLowerCase() ||
                parsed.profile.mobile_number === cleanId) &&
              password.length >= 6
            ) {
              setDoctorProfile(parsed.profile);
              setUser(parsed.user);
              setProfile(null);
              setRole('DOCTOR');
              localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, 'DOCTOR');
              return { success: true, role: 'DOCTOR' };
            }
          } catch {
            // ignore
          }
        }

        // Allow pre-seeded demo doctor: dr_ramesh / 9845199887
        if (cleanId.toLowerCase() === 'dr_ramesh' || cleanId === '9845199887') {
          const demoDoc = DEMO_DOCTOR_PROFILE;
          const mockUser = {
            id: demoDoc.user_id,
            email: 'dr_ramesh@doctor.healthwallet.local',
          } as User;
          setDoctorProfile(demoDoc);
          setProfile(null);
          setUser(mockUser);
          setRole('DOCTOR');
          localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, 'DOCTOR');
          localStorage.setItem(
            LOCAL_STORAGE_DOCTOR_SESSION_KEY,
            JSON.stringify({ user: mockUser, profile: demoDoc })
          );
          return { success: true, role: 'DOCTOR' };
        }

        return {
          success: false,
          error:
            'Doctor account not found in demo mode. Use username "dr_ramesh" (password: any) or register a new doctor account.',
        };
      }

      // Patient demo login
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (
            (parsed.profile.username.toLowerCase() === cleanId.toLowerCase() ||
              parsed.profile.mobile_number === cleanId) &&
            password.length >= 6
          ) {
            setProfile(parsed.profile);
            setUser(parsed.user);
            setDoctorProfile(null);
            setRole('PATIENT');
            localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, 'PATIENT');
            return { success: true, role: 'PATIENT' };
          }
        } catch {
          // ignore
        }
      }

      // Allow pre-seeded demo user: sunita_patil
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
        const mockUser = {
          id: 'demo-user-1',
          email: 'sunita_patil@patient.healthwallet.local',
        } as User;
        setProfile(demoProfile);
        setDoctorProfile(null);
        setUser(mockUser);
        setRole('PATIENT');
        localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, 'PATIENT');
        localStorage.setItem(
          LOCAL_STORAGE_SESSION_KEY,
          JSON.stringify({ user: mockUser, profile: demoProfile })
        );
        return { success: true, role: 'PATIENT' };
      }

      return {
        success: false,
        error:
          'Supabase credentials pending in .env. Use username "sunita_patil" or register a new patient account to test.',
      };
    }

    try {
      const isMobile = /^[6-9]\d{9}$/.test(cleanId);

      if (rolePreference === 'DOCTOR') {
        let authEmail = '';
        if (isMobile) {
          const { data: docMatch } = await supabase
            .from('doctor_profiles')
            .select('username')
            .eq('mobile_number', cleanId)
            .maybeSingle();

          if (!docMatch?.username) {
            return {
              success: false,
              error: 'No doctor account found with this mobile number. Please register first.',
            };
          }
          authEmail = `${docMatch.username.toLowerCase()}@doctor.healthwallet.local`;
        } else {
          authEmail = `${cleanId.toLowerCase()}@doctor.healthwallet.local`;
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (authError || !authData.user) {
          return {
            success: false,
            error: 'Invalid credentials. Please verify your doctor username and password.',
          };
        }

        const docData = await fetchDoctorProfile(authData.user.id);
        if (!docData) {
          return {
            success: false,
            error: 'Doctor profile record not found. Please contact hospital administrator.',
          };
        }

        setSession(authData.session);
        setUser(authData.user);
        setDoctorProfile(docData);
        setProfile(null);
        setRole('DOCTOR');
        return { success: true, role: 'DOCTOR' };
      }

      // Patient sign in
      let authEmail = '';
      if (isMobile) {
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
      setDoctorProfile(null);
      setRole('PATIENT');
      return { success: true, role: 'PATIENT' };
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

      const mockUser = { id: newProfile.user_id, email: authEmail } as User;
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, 'PATIENT');
      localStorage.setItem(
        LOCAL_STORAGE_SESSION_KEY,
        JSON.stringify({ user: mockUser, profile: newProfile })
      );

      return { success: true, profile: newProfile };
    }

    try {
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

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            patient_name: cleanName,
            mobile_number: cleanMobile,
            role: 'PATIENT',
          },
        },
      });

      if (signUpError || !authData.user) {
        return {
          success: false,
          error: signUpError?.message || 'Failed to create user authentication account.',
        };
      }

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

  // 3. DOCTOR REGISTRATION
  const registerDoctor = async (
    input: DoctorRegistrationInput
  ): Promise<{ success: boolean; profile?: DoctorProfile; error?: string }> => {
    const cleanName = input.doctorName.trim();
    const cleanRegNo = input.registrationNumber.trim().toUpperCase();
    const cleanSpec = input.specialization.trim();
    const cleanHosp = input.hospitalName.trim();
    const cleanMobile = input.mobileNumber.replace(/\D/g, '');
    const cleanUsername = input.username.trim().toLowerCase();
    const password = input.password;

    if (!cleanName) return { success: false, error: 'Doctor name is required.' };
    if (!cleanRegNo) return { success: false, error: 'Medical registration number is required.' };
    if (!cleanSpec) return { success: false, error: 'Medical specialization is required.' };
    if (!cleanHosp) return { success: false, error: 'Hospital or clinic affiliation is required.' };
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return { success: false, error: 'Enter a valid 10-digit Indian mobile number.' };
    }
    if (cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const authEmail = `${cleanUsername}@doctor.healthwallet.local`;

    if (!isSupabaseConfigured) {
      // Offline fallback
      const newDoc: DoctorProfile = {
        id: `mock-doc-${Date.now()}`,
        user_id: `mock-doc-user-${Date.now()}`,
        doctor_name: cleanName,
        registration_number: cleanRegNo,
        specialization: cleanSpec,
        hospital_name: cleanHosp,
        mobile_number: cleanMobile,
        username: cleanUsername,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockUser = { id: newDoc.user_id, email: authEmail } as User;
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, 'DOCTOR');
      localStorage.setItem(
        LOCAL_STORAGE_DOCTOR_SESSION_KEY,
        JSON.stringify({ user: mockUser, profile: newDoc })
      );

      return { success: true, profile: newDoc };
    }

    try {
      // Uniqueness check for username, registration number, and mobile number
      const { data: existingDoc } = await supabase
        .from('doctor_profiles')
        .select('id, username, registration_number, mobile_number')
        .or(
          `username.eq.${cleanUsername},registration_number.eq.${cleanRegNo},mobile_number.eq.${cleanMobile}`
        )
        .maybeSingle();

      if (existingDoc) {
        if (existingDoc.username?.toLowerCase() === cleanUsername) {
          return { success: false, error: 'This doctor username is already taken. Please choose another.' };
        }
        if (existingDoc.registration_number?.toUpperCase() === cleanRegNo) {
          return { success: false, error: 'This Medical Registration Number is already registered.' };
        }
        if (existingDoc.mobile_number === cleanMobile) {
          return { success: false, error: 'This mobile number is already linked to a doctor account.' };
        }
      }

      // Supabase Auth signup
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            doctor_name: cleanName,
            registration_number: cleanRegNo,
            role: 'DOCTOR',
          },
        },
      });

      if (signUpError || !authData.user) {
        return {
          success: false,
          error: signUpError?.message || 'Failed to create doctor authentication account.',
        };
      }

      // Insert into doctor_profiles (NO Health Wallet ID generated!)
      const { data: insertedDoc, error: insertError } = await supabase
        .from('doctor_profiles')
        .insert({
          user_id: authData.user.id,
          doctor_name: cleanName,
          registration_number: cleanRegNo,
          specialization: cleanSpec,
          hospital_name: cleanHosp,
          mobile_number: cleanMobile,
          username: cleanUsername,
        })
        .select('*')
        .single();

      if (insertError || !insertedDoc) {
        return {
          success: false,
          error: insertError?.message || 'Failed to save doctor profile to database.',
        };
      }

      return { success: true, profile: insertedDoc as DoctorProfile };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Unexpected error during doctor registration.',
      };
    }
  };

  // 4. LOGOUT
  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error signing out:', err);
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    localStorage.removeItem(LOCAL_STORAGE_DOCTOR_SESSION_KEY);
    localStorage.removeItem(LOCAL_STORAGE_ROLE_KEY);
    setUser(null);
    setProfile(null);
    setDoctorProfile(null);
    setRole(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        patientProfile: profile,
        doctorProfile,
        role,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        login,
        register,
        registerDoctor,
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

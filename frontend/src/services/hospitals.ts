import { supabase, isSupabaseConfigured } from './supabase';
import { recordMockAuditLog } from './audit';

export interface Hospital {
  id: string;
  hospital_name: string;
  hospital_code: string;
  state_code: string;
  state_name: string;
  city: string;
  district?: string | null;
  address?: string | null;
  pincode?: string | null;
  phone_number?: string | null;
  emergency_available: boolean;
  blood_bank_available: boolean;
  verified: boolean;
  active: boolean;
  is_seed?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  emergency_contact?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HospitalFilterOptions {
  verifiedOnly?: boolean;
  bloodBankOnly?: boolean;
  emergencyOnly?: boolean;
}

export interface HospitalSearchParams {
  state: string;
  city?: string;
  verifiedOnly?: boolean;
  bloodBankOnly?: boolean;
  emergencyOnly?: boolean;
}

export const LOCAL_STORAGE_HOSPITALS_KEY = 'health_wallet_v2_hospitals';

/**
 * Controlled, verified baseline hospital dataset.
 * Structured with real Indian hospitals across Tamil Nadu and Karnataka.
 * Tagged with is_seed: true for clear audit separation.
 */
export const SEED_HOSPITALS: Hospital[] = [
  // TAMIL NADU — SALEM
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    hospital_name: 'Salem Government Mohan Kumaramangalam Medical College Hospital',
    hospital_code: 'HOSP-TN-SLM-001',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Salem',
    district: 'Salem',
    address: 'Fort Main Road, Near Collectorate',
    pincode: '636001',
    phone_number: '+91 427 288 2200',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.6643,
    longitude: 78.146,
    website: 'https://gmkmc.ac.in',
    emergency_contact: '+91 427 288 2211',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    hospital_name: 'Manipal Hospital Salem',
    hospital_code: 'HOSP-TN-SLM-002',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Salem',
    district: 'Salem',
    address: 'Dalmia Board, Bangalore Highway',
    pincode: '636012',
    phone_number: '+91 427 234 6666',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.6912,
    longitude: 78.1215,
    website: 'https://manipalhospitals.com/salem',
    emergency_contact: '+91 427 234 6699',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    hospital_name: 'Sri Gokulam Hospital',
    hospital_code: 'HOSP-TN-SLM-003',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Salem',
    district: 'Salem',
    address: '3/60, Meyyanur Main Road',
    pincode: '636004',
    phone_number: '+91 427 244 8171',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.6621,
    longitude: 78.1348,
    website: 'https://gokulamhospital.com',
    emergency_contact: '+91 427 244 8179',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    hospital_name: 'SKS Hospital & Post Graduate Medical Institute',
    hospital_code: 'HOSP-TN-SLM-004',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Salem',
    district: 'Salem',
    address: '23, SKS Hospital Road, Fairlands',
    pincode: '636016',
    phone_number: '+91 427 404 1000',
    emergency_available: true,
    blood_bank_available: false,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.6738,
    longitude: 78.1442,
    website: 'https://skshospital.com',
    emergency_contact: '+91 427 404 1010',
  },

  // TAMIL NADU — COIMBATORE
  {
    id: 'a1000000-0000-0000-0000-000000000005',
    hospital_name: 'ABC Multi-Speciality Hospital',
    hospital_code: 'HOSP-TN-CBE-001',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Coimbatore',
    district: 'Coimbatore',
    address: '142, Avinashi Road, Peelamedu',
    pincode: '641004',
    phone_number: '+91 422 257 0170',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.0264,
    longitude: 76.9972,
    website: 'https://abchospital.medimind.org',
    emergency_contact: '+91 422 257 0199',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000006',
    hospital_name: 'PSG Hospitals',
    hospital_code: 'HOSP-TN-CBE-002',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Coimbatore',
    district: 'Coimbatore',
    address: 'Avinashi Road, Peelamedu',
    pincode: '641004',
    phone_number: '+91 422 257 0170',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.028,
    longitude: 77.001,
    website: 'https://psghospitals.com',
    emergency_contact: '+91 422 434 5000',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000007',
    hospital_name: 'Ganga Hospital',
    hospital_code: 'HOSP-TN-CBE-003',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Coimbatore',
    district: 'Coimbatore',
    address: '313, Mettupalayam Road, Saibaba Colony',
    pincode: '641043',
    phone_number: '+91 422 248 5000',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.0205,
    longitude: 76.953,
    website: 'https://gangahospital.com',
    emergency_contact: '+91 422 248 5011',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000008',
    hospital_name: 'Sri Ramakrishna Hospital',
    hospital_code: 'HOSP-TN-CBE-004',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Coimbatore',
    district: 'Coimbatore',
    address: '395, Sarojini Naidu Road, Sidhapudur',
    pincode: '641044',
    phone_number: '+91 422 450 0000',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.0145,
    longitude: 76.9782,
    website: 'https://sriramakrishnahospital.com',
    emergency_contact: '+91 422 450 0108',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000009',
    hospital_name: 'Coimbatore Medical College Hospital',
    hospital_code: 'HOSP-TN-CBE-005',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Coimbatore',
    district: 'Coimbatore',
    address: 'Trichy Road, Gopalapuram',
    pincode: '641018',
    phone_number: '+91 422 230 1393',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 10.9982,
    longitude: 76.9691,
    website: 'https://cmch.tn.gov.in',
    emergency_contact: '+91 422 230 1394',
  },

  // TAMIL NADU — CHENNAI
  {
    id: 'a1000000-0000-0000-0000-000000000010',
    hospital_name: 'Rajiv Gandhi Government General Hospital',
    hospital_code: 'HOSP-TN-MAA-001',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Chennai',
    district: 'Chennai',
    address: 'EVR Periyar Salai, Park Town',
    pincode: '600003',
    phone_number: '+91 44 2530 5000',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 13.0805,
    longitude: 80.2778,
    website: 'https://rggh.tn.gov.in',
    emergency_contact: '+91 44 2530 5108',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000011',
    hospital_name: 'Apollo Hospitals Greams Road',
    hospital_code: 'HOSP-TN-MAA-002',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Chennai',
    district: 'Chennai',
    address: '21, Greams Lane, Thousand Lights',
    pincode: '600006',
    phone_number: '+91 44 2829 0200',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 13.0594,
    longitude: 80.2505,
    website: 'https://apollohospitals.com',
    emergency_contact: '+91 44 2829 3333',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000012',
    hospital_name: 'The Madras Medical Mission',
    hospital_code: 'HOSP-TN-MAA-003',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Chennai',
    district: 'Chennai',
    address: '4-A, Dr. J. Jayalalitha Nagar, Mogappair',
    pincode: '600037',
    phone_number: '+91 44 2656 8000',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 13.0872,
    longitude: 80.1775,
    website: 'https://madrasmedicalmission.org',
    emergency_contact: '+91 44 2656 5961',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000013',
    hospital_name: 'Fortis Malar Hospital',
    hospital_code: 'HOSP-TN-MAA-004',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Chennai',
    district: 'Chennai',
    address: '52, 1st Main Rd, Gandhi Nagar, Adyar',
    pincode: '600020',
    phone_number: '+91 44 4289 2222',
    emergency_available: true,
    blood_bank_available: false,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 13.0067,
    longitude: 80.2575,
    website: 'https://fortishealthcare.com',
    emergency_contact: '+91 44 4289 2200',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000014',
    hospital_name: 'Government Stanley Medical College Hospital',
    hospital_code: 'HOSP-TN-MAA-005',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Chennai',
    district: 'Chennai',
    address: 'Old Jail Road, Royapuram',
    pincode: '600001',
    phone_number: '+91 44 2528 1351',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 13.107,
    longitude: 80.2925,
    website: 'https://stanley.tn.gov.in',
    emergency_contact: '+91 44 2528 1355',
  },

  // TAMIL NADU — MADURAI
  {
    id: 'a1000000-0000-0000-0000-000000000015',
    hospital_name: 'Government Rajaji Hospital',
    hospital_code: 'HOSP-TN-IXM-001',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Madurai',
    district: 'Madurai',
    address: 'Panagal Road, Shenoy Nagar',
    pincode: '625020',
    phone_number: '+91 452 253 2535',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 9.9288,
    longitude: 78.1272,
    website: 'https://grh.tn.gov.in',
    emergency_contact: '+91 452 253 2536',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000016',
    hospital_name: 'Meenakshi Mission Hospital & Research Centre',
    hospital_code: 'HOSP-TN-IXM-002',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Madurai',
    district: 'Madurai',
    address: 'Lake Area, Melur Main Road',
    pincode: '625107',
    phone_number: '+91 452 426 3000',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 9.9482,
    longitude: 78.1634,
    website: 'https://meenakshimission.org',
    emergency_contact: '+91 452 258 4500',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000017',
    hospital_name: 'Apollo Speciality Hospitals Madurai',
    hospital_code: 'HOSP-TN-IXM-003',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Madurai',
    district: 'Madurai',
    address: 'KK Nagar, Lake View Road',
    pincode: '625020',
    phone_number: '+91 452 258 0880',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 9.9325,
    longitude: 78.147,
    website: 'https://apollohospitals.com',
    emergency_contact: '+91 452 258 0888',
  },

  // TAMIL NADU — TRICHY
  {
    id: 'a1000000-0000-0000-0000-000000000018',
    hospital_name: 'Mahatma Gandhi Memorial Government Hospital',
    hospital_code: 'HOSP-TN-TRZ-001',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Trichy',
    district: 'Tiruchirappalli',
    address: 'Collector Office Road, Cantonment',
    pincode: '620001',
    phone_number: '+91 431 241 2511',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 10.805,
    longitude: 78.6856,
    website: 'https://mgmgh.tn.gov.in',
    emergency_contact: '+91 431 241 2512',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000019',
    hospital_name: 'Kauvery Hospital Trichy',
    hospital_code: 'HOSP-TN-TRZ-002',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Trichy',
    district: 'Tiruchirappalli',
    address: '1, K.C. Road, Tennur',
    pincode: '620017',
    phone_number: '+91 431 400 6000',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 10.822,
    longitude: 78.688,
    website: 'https://kauveryhospital.com',
    emergency_contact: '+91 431 400 6001',
  },

  // TAMIL NADU — HOSUR
  {
    id: 'a1000000-0000-0000-0000-000000000020',
    hospital_name: 'Hosur Government Hospital',
    hospital_code: 'HOSP-TN-HSR-001',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Hosur',
    district: 'Krishnagiri',
    address: 'Denkanikotta Road, Near Bus Stand',
    pincode: '635109',
    phone_number: '+91 4344 222 222',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 12.7409,
    longitude: 77.8253,
    website: 'https://hosurgh.tn.gov.in',
    emergency_contact: '+91 4344 222 223',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000021',
    hospital_name: 'Kauvery Hospital Hosur',
    hospital_code: 'HOSP-TN-HSR-002',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Hosur',
    district: 'Krishnagiri',
    address: 'SIPCOT Industrial Complex, Phase 1',
    pincode: '635126',
    phone_number: '+91 4344 661 111',
    emergency_available: true,
    blood_bank_available: false,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 12.756,
    longitude: 77.801,
    website: 'https://kauveryhospital.com/hosur',
    emergency_contact: '+91 4344 661 100',
  },

  // TAMIL NADU — ERODE
  {
    id: 'a1000000-0000-0000-0000-000000000022',
    hospital_name: 'Erode Government District Headquarters Hospital',
    hospital_code: 'HOSP-TN-ERD-001',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Erode',
    district: 'Erode',
    address: 'Perundurai Road',
    pincode: '638011',
    phone_number: '+91 424 225 8355',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.341,
    longitude: 77.7172,
    website: 'https://erodegh.tn.gov.in',
    emergency_contact: '+91 424 225 8356',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000023',
    hospital_name: 'Lotus Hospital Erode',
    hospital_code: 'HOSP-TN-ERD-002',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Erode',
    district: 'Erode',
    address: 'Poondurai Main Road, Kollampalayam',
    pincode: '638002',
    phone_number: '+91 424 228 2828',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 11.328,
    longitude: 77.729,
    website: 'https://lotushospitals.com',
    emergency_contact: '+91 424 228 2800',
  },

  // KARNATAKA — BANGALORE
  {
    id: 'a1000000-0000-0000-0000-000000000024',
    hospital_name: 'Victoria Hospital Bangalore',
    hospital_code: 'HOSP-KA-BLR-001',
    state_code: 'Karnataka',
    state_name: 'Karnataka',
    city: 'Bangalore',
    district: 'Bangalore Urban',
    address: 'Fort Road, Near City Market',
    pincode: '560002',
    phone_number: '+91 80 2670 1150',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 12.9629,
    longitude: 77.5753,
    website: 'https://victoriahospital.karnataka.gov.in',
    emergency_contact: '+91 80 2670 1155',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000025',
    hospital_name: 'Manipal Hospital HAL Airport Road',
    hospital_code: 'HOSP-KA-BLR-002',
    state_code: 'Karnataka',
    state_name: 'Karnataka',
    city: 'Bangalore',
    district: 'Bangalore Urban',
    address: '98, HAL Old Airport Road, Kodihalli',
    pincode: '560017',
    phone_number: '+91 80 2502 4444',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 12.9592,
    longitude: 77.6499,
    website: 'https://manipalhospitals.com/oldairportroad',
    emergency_contact: '+91 80 2502 3344',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000026',
    hospital_name: 'Narayana Health City Bangalore',
    hospital_code: 'HOSP-KA-BLR-003',
    state_code: 'Karnataka',
    state_name: 'Karnataka',
    city: 'Bangalore',
    district: 'Bangalore Urban',
    address: '258/A, Bommasandra Industrial Area, Anekal Taluk',
    pincode: '560099',
    phone_number: '+91 80 7122 2222',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 12.8175,
    longitude: 77.6917,
    website: 'https://narayanahealth.org',
    emergency_contact: '+91 80 7122 2200',
  },

  // KARNATAKA — MYSORE
  {
    id: 'a1000000-0000-0000-0000-000000000027',
    hospital_name: 'Apollo BGS Hospitals Mysore',
    hospital_code: 'HOSP-KA-MYS-001',
    state_code: 'Karnataka',
    state_name: 'Karnataka',
    city: 'Mysore',
    district: 'Mysore',
    address: 'Adhichunchanagiri Road, Kuvempunagar',
    pincode: '570023',
    phone_number: '+91 821 256 8888',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 12.289,
    longitude: 76.634,
    website: 'https://apollobgshospitals.com',
    emergency_contact: '+91 821 256 8899',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000028',
    hospital_name: 'Krishna Rajendra (KR) Hospital Mysore',
    hospital_code: 'HOSP-KA-MYS-002',
    state_code: 'Karnataka',
    state_name: 'Karnataka',
    city: 'Mysore',
    district: 'Mysore',
    address: 'Sayyaji Rao Road, Near Mysore Palace',
    pincode: '570001',
    phone_number: '+91 821 242 0500',
    emergency_available: true,
    blood_bank_available: true,
    verified: true,
    active: true,
    is_seed: true,
    latitude: 12.312,
    longitude: 76.651,
    website: 'https://krhospital.karnataka.gov.in',
    emergency_contact: '+91 821 242 0505',
  },

  // TEST FIXTURE RECORDS (Salem)
  // 1) Inactive hospital (active = false)
  {
    id: 'a1000000-0000-0000-0000-000000000029',
    hospital_name: 'Salem Orthopaedic Care Center',
    hospital_code: 'HOSP-TN-SLM-099',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Salem',
    district: 'Salem',
    address: '99, Junction Main Road',
    pincode: '636005',
    phone_number: '+91 427 999 0000',
    emergency_available: false,
    blood_bank_available: false,
    verified: false,
    active: false,
    is_seed: true,
  },
  // 2) Unverified clinic (verified = false, emergency = false, blood bank = false)
  {
    id: 'a1000000-0000-0000-0000-000000000030',
    hospital_name: 'Salem Community Health Clinic',
    hospital_code: 'HOSP-TN-SLM-098',
    state_code: 'Tamil Nadu',
    state_name: 'Tamil Nadu',
    city: 'Salem',
    district: 'Salem',
    address: '12, Bretts Road',
    pincode: '636001',
    phone_number: '+91 427 888 1111',
    emergency_available: false,
    blood_bank_available: false,
    verified: false,
    active: true,
    is_seed: true,
  },
];

function getStoredHospitals(): Hospital[] {
  if (typeof window === 'undefined') {
    return [...SEED_HOSPITALS];
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HOSPITALS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_HOSPITALS_KEY, JSON.stringify(SEED_HOSPITALS));
      return [...SEED_HOSPITALS];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [...SEED_HOSPITALS];
  }
}

function saveStoredHospitals(list: Hospital[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_HOSPITALS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not persist hospitals to localStorage', e);
    }
  }
}

/**
 * Filter hospital collection in-memory by options (active, verified, blood bank, emergency)
 */
function applyHospitalFilters(
  hospitals: Hospital[],
  filters?: HospitalFilterOptions,
  includeInactive: boolean = false
): Hospital[] {
  return hospitals.filter((h) => {
    if (!includeInactive && !h.active) return false;
    if (filters?.verifiedOnly && !h.verified) return false;
    if (filters?.bloodBankOnly && !h.blood_bank_available) return false;
    if (filters?.emergencyOnly && !h.emergency_available) return false;
    return true;
  });
}

const STATE_SYNONYMS: Record<string, string> = {
  tn: 'tamil nadu',
  'tamil nadu': 'tamil nadu',
  ka: 'karnataka',
  karnataka: 'karnataka',
  kl: 'kerala',
  kerala: 'kerala',
  ap: 'andhra pradesh',
  'andhra pradesh': 'andhra pradesh',
  ts: 'telangana',
  telangana: 'telangana',
  mh: 'maharashtra',
  maharashtra: 'maharashtra',
  dl: 'delhi',
  delhi: 'delhi',
  gj: 'gujarat',
  gujarat: 'gujarat',
  wb: 'west bengal',
  'west bengal': 'west bengal',
  up: 'uttar pradesh',
  'uttar pradesh': 'uttar pradesh',
  pb: 'punjab',
  punjab: 'punjab',
  rj: 'rajasthan',
  rajasthan: 'rajasthan',
};

/**
 * Normalizes state name / code for robust comparison
 */
export function normalizeState(stateStr: string): string {
  const clean = (stateStr || '').trim().toLowerCase();
  return STATE_SYNONYMS[clean] || clean;
}

/**
 * Get distinct active cities present in the hospital dataset for a given state
 */
export async function getHospitalCitiesByState(state: string): Promise<string[]> {
  const normState = normalizeState(state);
  if (!normState) return [];

  const getStoredCities = (): string[] => {
    const list = getStoredHospitals();
    const citiesSet = new Set<string>();
    list.forEach((h) => {
      if (h.active && (normalizeState(h.state_name) === normState || normalizeState(h.state_code) === normState)) {
        if (h.city && h.city.trim()) {
          citiesSet.add(h.city.trim());
        }
      }
    });
    return Array.from(citiesSet).sort();
  };

  if (!isSupabaseConfigured) {
    return getStoredCities();
  }

  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select('city')
      .eq('active', true)
      .or(`state_name.ilike.%${state.trim()}%,state_code.ilike.%${state.trim()}%`);

    if (error || !data || data.length === 0) {
      return getStoredCities();
    }

    const set = new Set<string>();
    data.forEach((row: any) => {
      if (row.city) set.add(row.city.trim());
    });
    const cities = Array.from(set).sort();
    return cities.length > 0 ? cities : getStoredCities();
  } catch (err) {
    console.warn('getHospitalCitiesByState error, falling back to stored', err);
    return getStoredCities();
  }
}

/**
 * Get hospitals by state (all cities, active only)
 */
export async function getHospitalsByState(
  state: string,
  filters?: HospitalFilterOptions
): Promise<Hospital[]> {
  const normState = normalizeState(state);
  if (!normState) return [];

  const getStoredFiltered = (): Hospital[] => {
    const list = getStoredHospitals();
    const matched = list.filter(
      (h) => normalizeState(h.state_name) === normState || normalizeState(h.state_code) === normState
    );
    return applyHospitalFilters(matched, filters);
  };

  if (!isSupabaseConfigured) {
    return getStoredFiltered();
  }

  try {
    let query = supabase
      .from('hospitals')
      .select('*')
      .eq('active', true)
      .or(`state_name.ilike.%${state.trim()}%,state_code.ilike.%${state.trim()}%`)
      .order('city', { ascending: true })
      .order('hospital_name', { ascending: true });

    if (filters?.verifiedOnly) {
      query = query.eq('verified', true);
    }
    if (filters?.bloodBankOnly) {
      query = query.eq('blood_bank_available', true);
    }
    if (filters?.emergencyOnly) {
      query = query.eq('emergency_available', true);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getStoredFiltered();
    }
    return data as Hospital[];
  } catch (err) {
    console.warn('getHospitalsByState error, falling back to stored', err);
    return getStoredFiltered();
  }
}

/**
 * Get hospitals by state and city (strictly isolated to that city)
 */
export async function getHospitalsByStateAndCity(
  state: string,
  city: string,
  filters?: HospitalFilterOptions
): Promise<Hospital[]> {
  const normState = normalizeState(state);
  const normCity = (city || '').trim().toLowerCase();
  if (!normState) return [];

  if (!normCity) {
    return getHospitalsByState(state, filters);
  }

  const getStoredCityFiltered = (): Hospital[] => {
    const list = getStoredHospitals();
    const matched = list.filter((h) => {
      const stateMatch = normalizeState(h.state_name) === normState || normalizeState(h.state_code) === normState;
      const cityMatch = (h.city || '').trim().toLowerCase() === normCity;
      return stateMatch && cityMatch;
    });
    return applyHospitalFilters(matched, filters);
  };

  if (!isSupabaseConfigured) {
    return getStoredCityFiltered();
  }

  try {
    let query = supabase
      .from('hospitals')
      .select('*')
      .eq('active', true)
      .ilike('city', city.trim())
      .or(`state_name.ilike.%${state.trim()}%,state_code.ilike.%${state.trim()}%`)
      .order('hospital_name', { ascending: true });

    if (filters?.verifiedOnly) {
      query = query.eq('verified', true);
    }
    if (filters?.bloodBankOnly) {
      query = query.eq('blood_bank_available', true);
    }
    if (filters?.emergencyOnly) {
      query = query.eq('emergency_available', true);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getStoredCityFiltered();
    }
    return data as Hospital[];
  } catch (err) {
    console.warn('getHospitalsByStateAndCity error, falling back to stored', err);
    return getStoredCityFiltered();
  }
}

/**
 * General unified search function for hospitals
 */
export async function searchHospitals(params: HospitalSearchParams): Promise<Hospital[]> {
  const { state, city, verifiedOnly, bloodBankOnly, emergencyOnly } = params;
  if (!state || !state.trim()) return [];

  const filters: HospitalFilterOptions = {
    verifiedOnly,
    bloodBankOnly,
    emergencyOnly,
  };

  if (city && city.trim()) {
    return getHospitalsByStateAndCity(state, city, filters);
  }

  return getHospitalsByState(state, filters);
}

/**
 * Get single hospital details by ID
 */
export async function getHospitalById(id: string): Promise<Hospital | null> {
  if (!id) return null;

  const getStoredHosp = (): Hospital | null => {
    const list = getStoredHospitals();
    return list.find((h) => h.id === id) || null;
  };

  if (!isSupabaseConfigured) {
    return getStoredHosp();
  }

  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return getStoredHosp();
    }
    return data as Hospital;
  } catch (err) {
    console.warn('getHospitalById error, falling back to stored', err);
    return getStoredHosp();
  }
}

/**
 * Convenience helper: get only verified hospitals
 */
export async function getVerifiedHospitals(state?: string, city?: string): Promise<Hospital[]> {
  if (state && city) {
    return getHospitalsByStateAndCity(state, city, { verifiedOnly: true });
  }
  if (state) {
    return getHospitalsByState(state, { verifiedOnly: true });
  }
  const all = getStoredHospitals();
  return applyHospitalFilters(all, { verifiedOnly: true });
}

/**
 * Convenience helper: get hospitals with blood banks
 */
export async function getHospitalsWithBloodBanks(state?: string, city?: string): Promise<Hospital[]> {
  if (state && city) {
    return getHospitalsByStateAndCity(state, city, { bloodBankOnly: true });
  }
  if (state) {
    return getHospitalsByState(state, { bloodBankOnly: true });
  }
  const all = getStoredHospitals();
  return applyHospitalFilters(all, { bloodBankOnly: true });
}

/**
 * Convenience helper: get hospitals with emergency services
 */
export async function getEmergencyHospitals(state?: string, city?: string): Promise<Hospital[]> {
  if (state && city) {
    return getHospitalsByStateAndCity(state, city, { emergencyOnly: true });
  }
  if (state) {
    return getHospitalsByState(state, { emergencyOnly: true });
  }
  const all = getStoredHospitals();
  return applyHospitalFilters(all, { emergencyOnly: true });
}

/**
 * Authorized mutation: Create Hospital (Audit recorded)
 * Restricted to administrative users / authorized hospital personnel.
 */
export async function createHospital(
  data: Partial<Hospital>,
  operatorUserId: string = 'mock-admin-uid',
  operatorRole: string = 'ADMIN'
): Promise<{ success: boolean; data?: Hospital; error?: string }> {
  // Authorization check: Patients and Donors CANNOT create hospitals
  if (operatorRole === 'PATIENT' || operatorRole === 'DONOR') {
    return { success: false, error: 'Unauthorized: Patients and voluntary donors cannot create hospital records.' };
  }

  if (!data.hospital_name || !data.city || !data.state_name) {
    return { success: false, error: 'Hospital name, state, and city are mandatory.' };
  }

  const newHospital: Hospital = {
    id: data.id || `hosp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    hospital_name: data.hospital_name.trim(),
    hospital_code: data.hospital_code || `HOSP-${Date.now().toString(36).toUpperCase()}`,
    state_code: data.state_code || data.state_name,
    state_name: data.state_name.trim(),
    city: data.city.trim(),
    district: data.district || null,
    address: data.address || null,
    pincode: data.pincode || null,
    phone_number: data.phone_number || null,
    emergency_available: data.emergency_available ?? false,
    blood_bank_available: data.blood_bank_available ?? false,
    verified: data.verified ?? false,
    active: data.active ?? true,
    is_seed: false,
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    website: data.website || null,
    emergency_contact: data.emergency_contact || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    const list = getStoredHospitals();
    list.unshift(newHospital);
    saveStoredHospitals(list);

    recordMockAuditLog({
      user_id: operatorUserId,
      role: operatorRole as 'ADMIN' | 'DOCTOR' | 'SYSTEM',
      action: 'CREATE_HOSPITAL',
      record_type: 'HOSPITAL',
      record_id: newHospital.id,
      status: 'SUCCESS',
      metadata: {
        hospital_name: newHospital.hospital_name,
        hospital_code: newHospital.hospital_code,
        city: newHospital.city,
        state: newHospital.state_name,
      },
    });

    return { success: true, data: newHospital };
  }

  try {
    const { data: inserted, error } = await supabase
      .from('hospitals')
      .insert(newHospital)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: inserted as Hospital };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hospital creation failed' };
  }
}

/**
 * Authorized mutation: Update Hospital (Audit recorded)
 * Restricted to administrative users / authorized hospital personnel.
 */
export async function updateHospital(
  id: string,
  updates: Partial<Hospital>,
  operatorUserId: string = 'mock-admin-uid',
  operatorRole: string = 'ADMIN'
): Promise<{ success: boolean; data?: Hospital; error?: string }> {
  // Authorization check: Patients and Donors CANNOT modify hospitals
  if (operatorRole === 'PATIENT' || operatorRole === 'DONOR') {
    return { success: false, error: 'Unauthorized: Patients and voluntary donors cannot modify hospital records.' };
  }

  if (!id) {
    return { success: false, error: 'Hospital ID is required.' };
  }

  if (!isSupabaseConfigured) {
    const list = getStoredHospitals();
    const idx = list.findIndex((h) => h.id === id);
    if (idx < 0) {
      return { success: false, error: 'Hospital record not found.' };
    }

    const updated: Hospital = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[idx] = updated;
    saveStoredHospitals(list);

    let specificAction: 'UPDATE_HOSPITAL' | 'VERIFY_HOSPITAL' | 'UPDATE_HOSPITAL_EMERGENCY_STATUS' | 'UPDATE_HOSPITAL_BLOOD_BANK_STATUS' = 'UPDATE_HOSPITAL';
    if (updates.verified !== undefined && Object.keys(updates).length <= 2) {
      specificAction = 'VERIFY_HOSPITAL';
    } else if (updates.emergency_available !== undefined && Object.keys(updates).length <= 2) {
      specificAction = 'UPDATE_HOSPITAL_EMERGENCY_STATUS';
    } else if (updates.blood_bank_available !== undefined && Object.keys(updates).length <= 2) {
      specificAction = 'UPDATE_HOSPITAL_BLOOD_BANK_STATUS';
    }

    recordMockAuditLog({
      user_id: operatorUserId,
      role: operatorRole as 'ADMIN' | 'DOCTOR' | 'SYSTEM',
      action: specificAction,
      record_type: 'HOSPITAL',
      record_id: id,
      status: 'SUCCESS',
      metadata: {
        updated_fields: Object.keys(updates),
        hospital_name: updated.hospital_name,
        verified: updated.verified,
        emergency_available: updated.emergency_available,
        blood_bank_available: updated.blood_bank_available,
      },
    });

    return { success: true, data: updated };
  }

  try {
    const { data: updated, error } = await supabase
      .from('hospitals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: updated as Hospital };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hospital update failed' };
  }
}

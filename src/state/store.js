import { databaseService } from '../services/databaseService.js';
import { logoutUser } from '../services/authService.js';
import { activateDoctor } from '../services/doctorService.js';
import { isSupabaseConfigured } from '../services/supabaseClient.js';

class HealthWalletStore {
  constructor() {
    this.listeners = new Set();
    this.state = {
      // Authentication (Starts unauthenticated strictly per prompt)
      currentUser: null,
      currentDoctor: null,
      currentPatient: null,
      selectedLoginRole: 'doctor',
      loginError: null,

      // Navigation
      activeNav: 'dashboard',

      // Modals
      isActivationModalOpen: false,
      activationRole: 'doctor',
      activationSuccessData: null, // { role, name, username, healthWalletId, entityId }

      // Clinical & Provider Search State
      searchedPatientId: '',
      searchedPatient: null,
      isPatientSearched: false,
      searchError: null,
      isSearching: false,

      // Longitudinal Clinical Data (Loaded strictly from database)
      patientRecords: [],
      patientLabReports: [],
      patientPrescriptions: [],
      isAddRecordOpen: false,
      isAddLabOpen: false,
      isAddDoctorLabOpen: false,
      doctorClinicalTab: 'all', // 'all', 'consultations', 'labs'
      isSavingRecord: false,
      recordSaveSuccess: null,
      recordSaveError: null,
      labSaveSuccess: null,
      labSaveError: null,

      // Access Audit Logs
      accessLogs: [],

      // Notification Toasts
      toasts: []
    };
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify();
  }

  // ----------------------------------------------------
  // AUTHENTICATION WORKFLOW
  // ----------------------------------------------------

  setSelectedLoginRole(role) {
    this.setState({ selectedLoginRole: role, loginError: null });
  }

  async login(loginId, password, selectedRole = null) {
    const roleToUse = selectedRole || this.state.selectedLoginRole || 'doctor';
    try {
      this.setState({ isSearching: true, searchError: null, loginError: null });
      const session = await databaseService.login(loginId, password, roleToUse);

      this.setState({
        currentUser: session.currentUser,
        currentDoctor: session.currentDoctor,
        currentPatient: session.currentPatient,
        activeNav: 'dashboard',
        searchedPatientId: '',
        searchedPatient: null,
        isPatientSearched: false,
        patientRecords: [],
        patientLabReports: [],
        patientPrescriptions: [],
        searchError: null,
        loginError: null,
        recordSaveSuccess: null,
        recordSaveError: null,
        isSearching: false
      });

      // If patient logged in, load their own clinical records from database
      if (session.currentPatient) {
        await this.loadPatientOwnData(session.currentPatient.id);
      }

      // If record keeper or admin, load audit logs
      if (session.currentUser && session.currentUser.role === 'record_keeper') {
        const logs = await databaseService.getAuditLogs();
        this.setState({ accessLogs: logs });
      }

      this.addToast(`Welcome back, ${session.currentUser.full_name || session.currentUser.name}`, 'success');
      return true;
    } catch (err) {
      this.setState({ isSearching: false, loginError: err.message || 'Invalid username or password' });
      this.addToast(err.message || 'Invalid username or password', 'error');
      return false;
    }
  }

  async logout() {
    const user = this.state.currentUser;
    if (user) {
      try {
        await databaseService.logAudit?.({
          userId: user.id || user.login_id,
          userName: user.full_name || user.name,
          role: user.role,
          action: 'LOGOUT',
          purpose: 'Session Termination',
          details: 'User logged out'
        });
      } catch (e) {
        console.warn('Audit error on logout:', e.message);
      }
    }

    try {
      await logoutUser();
    } catch (e) {}

    this.setState({
      currentUser: null,
      currentDoctor: null,
      currentPatient: null,
      activeNav: 'dashboard',
      searchedPatientId: '',
      searchedPatient: null,
      isPatientSearched: false,
      searchError: null,
      loginError: null,
      patientRecords: [],
      patientLabReports: [],
      patientPrescriptions: [],
      isAddRecordOpen: false,
      isAddLabOpen: false,
      recordSaveSuccess: null,
      recordSaveError: null,
      accessLogs: []
    });
    this.addToast('Logged out successfully', 'info');
  }

  // ----------------------------------------------------
  // ACTIVATION & REGISTRATION WORKFLOW
  // ----------------------------------------------------

  openActivationModal(role = 'doctor') {
    this.setState({
      isActivationModalOpen: true,
      activationRole: role,
      activationSuccessData: null
    });
  }

  closeActivationModal() {
    this.setState({
      isActivationModalOpen: false,
      activationSuccessData: null
    });
  }

  setActivationRole(role) {
    this.setState({ activationRole: role });
  }

  async registerNewAccount(data) {
    try {
      const res = await databaseService.registerAccount(data);
      this.setState({
        activationSuccessData: {
          role: res.role,
          roleId: res.roleId,
          name: res.name,
          username: res.username,
          healthWalletId: res.healthWalletId,
          entityId: res.entityId,
          state: res.state || data.state,
          bloodGroup: res.bloodGroup || data.bloodGroup,
          gender: res.gender || data.gender
        }
      });
      this.addToast(`${res.role} account created successfully!`, 'success');
      return res;
    } catch (err) {
      this.addToast(err.message || 'Registration failed.', 'error');
      throw err;
    }
  }

  async activatePatientAccount(data) {
    return this.registerNewAccount({
      ...data,
      role: 'PATIENT',
      name: data.fullName || data.name,
      username: data.username || data.loginId || data.healthWalletId || generateHealthWalletId(),
      healthWalletId: data.healthWalletId || null
    });
  }

  // ----------------------------------------------------
  // CLINICAL & PROVIDER SEARCH (DOCTOR / LAB / PHARMACY)
  // ----------------------------------------------------

  setSearchedPatientId(id) {
    this.setState({ searchedPatientId: id });
  }

  async searchPatient(healthWalletId) {
    const targetId = (healthWalletId || this.state.searchedPatientId || '').trim();
    if (!targetId) {
      this.setState({ searchError: 'Please enter a Health Wallet ID.' });
      return false;
    }

    this.setState({
      isSearching: true,
      searchError: null,
      recordSaveSuccess: null,
      recordSaveError: null
    });

    try {
      // Query DATABASE for patient (Supabase PostgreSQL / Persistent Storage)
      const patient = await databaseService.searchPatientByHealthWalletId(
        targetId,
        this.state.currentUser?.id,
        this.state.currentUser?.role
      );

      if (!patient) {
        this.setState({
          searchedPatient: null,
          patientRecords: [],
          patientLabReports: [],
          patientPrescriptions: [],
          isPatientSearched: false,
          searchError: 'Patient not found.',
          isSearching: false
        });
        return false;
      }

      // Query DATABASE for patient records, lab reports, medications
      const [records, labs, rxList] = await Promise.all([
        databaseService.getPatientMedicalRecords(patient.id),
        databaseService.getPatientLabReports(patient.id),
        databaseService.getPatientMedications(patient.id)
      ]);

      this.setState({
        searchedPatient: patient,
        searchedPatientId: patient.health_wallet_id,
        patientRecords: records,
        patientLabReports: labs,
        patientPrescriptions: rxList,
        isPatientSearched: true,
        searchError: null,
        isSearching: false
      });

      return true;
    } catch (err) {
      this.setState({
        searchedPatient: null,
        patientRecords: [],
        patientLabReports: [],
        patientPrescriptions: [],
        isPatientSearched: false,
        searchError: 'Unable to connect to Health Wallet database. Please try again.',
        isSearching: false
      });
      return false;
    }
  }

  // ----------------------------------------------------
  // DOCTOR PORTAL: ADD & SAVE MEDICAL RECORD
  // ----------------------------------------------------

  toggleAddRecordForm(force) {
    const nextState = typeof force === 'boolean' ? force : !this.state.isAddRecordOpen;
    this.setState({
      isAddRecordOpen: nextState,
      recordSaveSuccess: null,
      recordSaveError: null
    });
  }

  async addMedicalRecord(recordData) {
    const patient = this.state.searchedPatient;
    const doctor = this.state.currentDoctor || {
      id: this.state.currentUser?.doctor_id || this.state.currentUser?.id || 'DOC-GENERIC',
      full_name: this.state.currentUser?.full_name || this.state.currentUser?.name || 'Attending Physician'
    };

    if (!patient) {
      this.setState({ recordSaveError: 'No active patient selected.' });
      return null;
    }
    if (!doctor) {
      this.setState({ recordSaveError: 'No verified doctor session active.' });
      return null;
    }

    this.setState({
      isSavingRecord: true,
      recordSaveSuccess: null,
      recordSaveError: null
    });

    try {
      // Persistent insertion into Database (Supabase PostgreSQL / Local)
      const saved = await databaseService.saveMedicalRecord({
        patientId: patient.id,
        doctorId: doctor.id,
        visitDate: recordData.visitDate || recordData.date,
        symptoms: recordData.symptoms || recordData.chiefComplaint || '',
        diagnosis: recordData.diagnosis,
        treatment: recordData.treatment || '',
        prescription: recordData.prescription || recordData.medicine || '',
        medicineName: recordData.medicine || recordData.prescription || '',
        dosage: recordData.dosage || '',
        frequency: recordData.frequency || '',
        duration: recordData.duration || '30 days',
        followUpDate: recordData.followUpDate || recordData.follow_up_date || '',
        notes: recordData.doctorNotes || recordData.notes || ''
      });

      // Immediately refresh patient's records and prescriptions from DATABASE
      const [updatedRecords, updatedRx] = await Promise.all([
        databaseService.getPatientMedicalRecords(patient.id),
        databaseService.getPatientMedications(patient.id)
      ]);

      this.setState({
        patientRecords: updatedRecords,
        patientPrescriptions: updatedRx,
        isAddRecordOpen: false,
        isSavingRecord: false,
        recordSaveSuccess: 'Medical record saved successfully.'
      });

      this.addToast('Medical record saved successfully.', 'success');
      return saved;
    } catch (err) {
      this.setState({
        isSavingRecord: false,
        recordSaveError: err.message || 'Medical record could not be saved.'
      });
      this.addToast(err.message || 'Medical record could not be saved.', 'error');
      return null;
    }
  }

  // ----------------------------------------------------
  // LAB PORTAL: ADD LAB REPORT
  // ----------------------------------------------------

  toggleAddDoctorLabForm(force) {
    const next = typeof force === 'boolean' ? force : !this.state.isAddDoctorLabOpen;
    this.setState({
      isAddDoctorLabOpen: next,
      labSaveSuccess: null,
      labSaveError: null
    });
  }

  setDoctorClinicalTab(tab) {
    this.setState({ doctorClinicalTab: tab });
  }

  // ----------------------------------------------------
  // LAB REPORTS: ADD & SAVE
  // ----------------------------------------------------

  toggleAddLabForm(force) {
    const nextState = typeof force === 'boolean' ? force : !this.state.isAddLabOpen;
    this.setState({ isAddLabOpen: nextState, labSaveSuccess: null, labSaveError: null });
  }

  async addLabReport(reportData) {
    const patient = this.state.searchedPatient;
    if (!patient) {
      this.addToast('Please search and select a patient first.', 'error');
      return null;
    }

    try {
      const saved = await databaseService.saveLabReport({
        patientId: patient.id,
        labName: reportData.labName || 'Apex Diagnostics',
        doctorId: this.state.currentDoctor?.id || this.state.currentUser?.id || null,
        testName: reportData.testName,
        testDate: reportData.testDate || reportData.reportDate,
        reportDate: reportData.testDate || reportData.reportDate,
        result: reportData.result,
        referenceRange: reportData.referenceRange || '',
        notes: reportData.notes || '',
        status: reportData.status || 'Verified Provider',
        reportFilePath: reportData.reportFilePath || null,
        file: reportData.file || null
      });

      const updatedLabs = await databaseService.getPatientLabReports(patient.id);
      this.setState({
        patientLabReports: updatedLabs,
        isAddLabOpen: false,
        isAddDoctorLabOpen: false,
        labSaveSuccess: 'Lab report added successfully.'
      });

      this.addToast('Lab report saved successfully.', 'success');
      return saved;
    } catch (err) {
      this.setState({ labSaveError: err.message || 'Failed to save lab report.' });
      this.addToast(err.message || 'Failed to save lab report.', 'error');
      return null;
    }
  }


  // ----------------------------------------------------
  // PHARMACY PORTAL: DISPENSE MEDICATION
  // ----------------------------------------------------

  async dispenseMedication(prescriptionId) {
    const patient = this.state.searchedPatient;
    try {
      await databaseService.dispenseMedication({
        medicationId: prescriptionId,
        patientId: patient?.id,
        dispensedBy: this.state.currentUser?.organization || this.state.currentUser?.full_name || 'MedPlus Care Pharmacy'
      });

      if (patient) {
        const updatedRx = await databaseService.getPatientMedications(patient.id);
        this.setState({ patientPrescriptions: updatedRx });
      }

      this.addToast('Prescription marked as dispensed.', 'success');
      return true;
    } catch (err) {
      this.addToast(err.message || 'Dispensing failed.', 'error');
      return false;
    }
  }

  // ----------------------------------------------------
  // PATIENT PORTAL
  // ----------------------------------------------------

  async loadPatientOwnData(patientId) {
    try {
      const [records, labs, rxList, logs] = await Promise.all([
        databaseService.getPatientMedicalRecords(patientId),
        databaseService.getPatientLabReports(patientId),
        databaseService.getPatientMedications(patientId),
        databaseService.getAuditLogs(patientId)
      ]);

      this.setState({
        patientRecords: records,
        patientLabReports: labs,
        patientPrescriptions: rxList,
        accessLogs: logs
      });
    } catch (err) {
      console.error('Error loading patient own data:', err);
    }
  }

  setActiveNav(nav) {
    this.setState({ activeNav: nav });
  }

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------

  addToast(message, type = 'info') {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };
    this.setState({ toasts: [...this.state.toasts, toast] });

    setTimeout(() => {
      this.removeToast(id);
    }, 4500);
  }

  removeToast(id) {
    this.setState({
      toasts: this.state.toasts.filter(t => t.id !== id)
    });
  }
}

export const store = new HealthWalletStore();

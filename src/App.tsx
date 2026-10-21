/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  ShiftWithDetails,
  Coworker,
  ShiftChangeLog,
  PersonalNote,
  ReminderSetting,
  UserProfile,
  ConflictIssue,
} from './types/index.ts';
import { DataService } from './services/dataService.ts';
import { detectAllConflicts } from './lib/conflictDetection.ts';
import { Header } from './components/Header.tsx';
import { Navigation, NavTab } from './components/Navigation.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { MyShiftsPage } from './pages/MyShiftsPage.tsx';
import { ShiftFormPage } from './pages/ShiftFormPage.tsx';
import { CoworkersPage } from './pages/CoworkersPage.tsx';
import { AiParserPage } from './pages/AiParserPage.tsx';
import { ChangeHistoryPage } from './pages/ChangeHistoryPage.tsx';
import { NotesPage } from './pages/NotesPage.tsx';
import { StatisticsPage } from './pages/StatisticsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { OnboardingModal } from './components/OnboardingModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { LoginShiftAlertModal } from './components/LoginShiftAlertModal.tsx';
import { APP_METADATA } from './lib/constants.ts';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('labshift_logged_in') !== 'false';
  });

  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([]);
  const [coworkers, setCoworkers] = useState<Coworker[]>([]);
  const [changeLogs, setChangeLogs] = useState<ShiftChangeLog[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    id: 'atlm-default',
    displayName: 'ATLM Patologi Klinik',
    jobTitle: 'Ahli Teknologi Laboratorium Medik',
    workUnit: 'Instalasi Laboratorium Patologi Klinik RSUD SSMA Pontianak',
  });
  const [reminders, setReminders] = useState<ReminderSetting>({
    enabled: true,
    dayBeforeEnabled: true,
    dayBeforeTime: '20:00',
    minutesBeforeShift: 60,
    browserNotificationsEnabled: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoginShiftAlertOpen, setIsLoginShiftAlertOpen] = useState(false);

  // Form states
  const [formDate, setFormDate] = useState<string | undefined>(undefined);
  const [editShiftId, setEditShiftId] = useState<string | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [
        loadedShifts,
        loadedCoworkers,
        loadedLogs,
        loadedNotes,
        loadedProfile,
        loadedReminders,
      ] = await Promise.all([
        DataService.getShifts(),
        DataService.getCoworkers(),
        DataService.getChangeLogs(),
        DataService.getNotes(),
        DataService.getProfile(),
        DataService.getReminderSettings(),
      ]);

      setShifts(loadedShifts);
      setCoworkers(loadedCoworkers);
      setChangeLogs(loadedLogs);
      setNotes(loadedNotes);
      setProfile(loadedProfile);
      setReminders(loadedReminders);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Purge any lingering dummy/sample data from previous sessions
    DataService.clearAllDummyData();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
      setIsLoginShiftAlertOpen(true);

      // Subscribe to live real-time sync (Supabase and local cross-tab)
      const unsubscribe = DataService.subscribeRealtime(() => {
        loadData();
      });

      // Check if first-run onboarding has been completed
      const hasSeenOnboarding = localStorage.getItem('labshift_onboarding_completed');
      if (!hasSeenOnboarding) {
        setIsOnboardingOpen(true);
        localStorage.setItem('labshift_onboarding_completed', 'true');
      }

      return () => {
        unsubscribe();
      };
    }
  }, [isLoggedIn, loadData]);

  // Conflict detection across all active shifts
  const conflicts: ConflictIssue[] = detectAllConflicts(shifts);

  // Navigation handlers
  const handleOpenAddShift = (date?: string) => {
    setEditShiftId(null);
    setFormDate(date);
    setActiveTab('add_shift');
  };

  const handleOpenEditShift = (shiftId: string) => {
    setEditShiftId(shiftId);
    setFormDate(undefined);
    setActiveTab('add_shift');
  };

  const handleGoToCalendar = (date?: string) => {
    if (date) setFormDate(date);
    setActiveTab('calendar');
  };

  const handleQuickAddCoworker = async (name: string): Promise<Coworker> => {
    const created = await DataService.createCoworker({ name });
    await loadData();
    return created;
  };

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLoginSuccess={async (email, displayName) => {
          setIsLoggedIn(true);
          localStorage.setItem('labshift_logged_in', 'true');
          setActiveTab('today');
          setIsLoginShiftAlertOpen(true);
          await loadData();
          if (displayName && (!profile?.displayName || profile.displayName === 'ATLM Patologi Klinik')) {
            await DataService.updateProfile({ displayName });
            await loadData();
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-16 md:pb-8">
      {/* Top Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setActiveTab('settings')}
      />

      {/* Main Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'add_shift') {
            setEditShiftId(null);
            setFormDate(undefined);
          }
          setActiveTab(tab);
        }}
        conflictCount={conflicts.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              Memuat data LabShift Personal...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'today' && (
              <DashboardPage
                shifts={shifts}
                conflicts={conflicts}
                profile={profile}
                onAddShift={handleOpenAddShift}
                onEditShift={handleOpenEditShift}
                onGoToCalendar={handleGoToCalendar}
                onGoToAiParser={() => setActiveTab('ai_parser')}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarPage
                shifts={shifts}
                conflicts={conflicts}
                initialSelectedDate={formDate}
                onAddShift={handleOpenAddShift}
                onEditShift={handleOpenEditShift}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'my_shifts' && (
              <MyShiftsPage
                shifts={shifts}
                profile={profile}
                onAddShift={handleOpenAddShift}
                onEditShift={handleOpenEditShift}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'add_shift' && (
              <ShiftFormPage
                initialDate={formDate}
                editShiftId={editShiftId}
                existingShifts={shifts}
                coworkers={coworkers}
                onSaved={() => {
                  loadData();
                  setActiveTab('calendar');
                }}
                onCancel={() => setActiveTab('calendar')}
                onQuickAddCoworker={handleQuickAddCoworker}
              />
            )}

            {activeTab === 'coworkers' && (
              <CoworkersPage
                coworkers={coworkers}
                shifts={shifts}
                onRefresh={loadData}
                onGoToShift={(shiftId) => handleOpenEditShift(shiftId)}
              />
            )}

            {activeTab === 'ai_parser' && (
              <AiParserPage
                shifts={shifts}
                coworkers={coworkers}
                onShiftImported={() => {
                  loadData();
                  setActiveTab('today');
                }}
                onQuickAddCoworker={handleQuickAddCoworker}
              />
            )}

            {activeTab === 'changes' && (
              <ChangeHistoryPage changeLogs={changeLogs} />
            )}

            {activeTab === 'notes' && (
              <NotesPage notes={notes} onRefresh={loadData} />
            )}

            {activeTab === 'stats' && (
              <StatisticsPage
                shifts={shifts}
                changeLogs={changeLogs}
                conflicts={conflicts}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPage
                profile={profile}
                reminders={reminders}
                onRefresh={loadData}
                onOpenOnboarding={() => setIsOnboardingOpen(true)}
                onLogout={() => {
                  setIsLoggedIn(false);
                  localStorage.setItem('labshift_logged_in', 'false');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        shifts={shifts}
        coworkers={coworkers}
        notes={notes}
        onSelectShift={(shiftId) => handleOpenEditShift(shiftId)}
        onSelectCoworker={(_cId) => setActiveTab('coworkers')}
      />

      {/* Onboarding Guide Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        displayName={profile.displayName}
        onUpdateDisplayName={async (name) => {
          await DataService.updateProfile({ displayName: name });
          loadData();
        }}
      />

      {/* Login Shift Status & Coworkers Alert Modal */}
      <LoginShiftAlertModal
        isOpen={isLoginShiftAlertOpen}
        onClose={() => setIsLoginShiftAlertOpen(false)}
        shifts={shifts}
        coworkers={coworkers}
        displayName={profile.displayName}
      />

      {/* PWA Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Subtle Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/70 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">LabShift Personal</span>
            <span>·</span>
            <span>{APP_METADATA.hospital}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Aplikasi produktivitas mandiri ATLM (Bukan sistem administrasi resmi RSUD).
          </div>
        </div>
      </footer>
    </div>
  );
}

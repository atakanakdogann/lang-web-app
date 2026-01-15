import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Award, LogOut, User, Camera, Save, Trash2,
  ChevronRight, Globe, Lock, Bell, Shield, Palette,
  BookOpen, Target, Star, Flame, Trophy, Zap, Check,
  Languages, GraduationCap, Heart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../services/supabaseClient';
import { profileService, UserStats } from '../services/profileService';
import { useTranslation } from '../services/i18n';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const INTERESTS = [
  { id: 'travel', emoji: '✈️', name: 'Travel' },
  { id: 'food', emoji: '🍕', name: 'Food' },
  { id: 'tech', emoji: '💻', name: 'Tech' },
  { id: 'sports', emoji: '⚽', name: 'Sports' },
  { id: 'music', emoji: '🎵', name: 'Music' },
  { id: 'movies', emoji: '🎬', name: 'Movies' },
  { id: 'business', emoji: '💼', name: 'Business' },
  { id: 'science', emoji: '🔬', name: 'Science' },
  { id: 'art', emoji: '🎨', name: 'Art' },
  { id: 'gaming', emoji: '🎮', name: 'Gaming' },
  { id: 'health', emoji: '🏥', name: 'Health' },
  { id: 'nature', emoji: '🌿', name: 'Nature' },
];

type SettingsSection = 'profile' | 'language' | 'interests' | 'security' | 'danger';

const Profile: React.FC = () => {
  const { profile, signOut, user, refreshProfile } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Stats
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Settings states
  const [editedUsername, setEditedUsername] = useState(profile?.username || '');
  const [selectedNativeLang, setSelectedNativeLang] = useState(profile?.native_lang || 'en');
  const [selectedTargetLang, setSelectedTargetLang] = useState(profile?.target_lang || 'en');
  const [selectedLevel, setSelectedLevel] = useState(profile?.proficiency_level || 'B1');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests || []);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Load stats on mount
  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  // Update state when profile changes
  useEffect(() => {
    if (profile) {
      setEditedUsername(profile.username || '');
      setSelectedNativeLang(profile.native_lang || 'en');
      setSelectedTargetLang(profile.target_lang || 'en');
      setSelectedLevel(profile.proficiency_level || 'B1');
      setSelectedInterests(profile.interests || []);
    }
  }, [profile]);

  const loadStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const userStats = await profileService.getUserStats(user.id);
      setStats(userStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    if (confirm(t('profile.confirm_logout'))) {
      await signOut();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      window.location.reload();
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(t('profile.error'), t('profile.avatar_error'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: editedUsername })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(t('profile.success'), t('profile.save_success'));
      if (refreshProfile) refreshProfile();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('profile.error'), t('profile.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLanguage = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await profileService.updateLanguageSettings(user.id, selectedNativeLang, selectedTargetLang, selectedLevel);
      toast.success(t('profile.success'), t('profile.save_success'));
      if (refreshProfile) refreshProfile();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('profile.error'), t('profile.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInterests = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await profileService.updateInterests(user.id, selectedInterests);
      toast.success(t('profile.success'), t('profile.save_success'));
      if (refreshProfile) refreshProfile();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('profile.error'), t('profile.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.warning(t('profile.warning'), t('profile.password_mismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.warning(t('profile.warning'), t('profile.password_too_short'));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success(t('profile.success'), t('profile.password_success'));
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(t('profile.error'), error.message || t('profile.password_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.warning(t('profile.warning'), t('profile.delete_type_confirm'));
      return;
    }

    if (!confirm(t('profile.confirm_delete'))) return;

    setIsSaving(true);
    try {
      await profileService.deleteAccount(user!.id);
      await signOut();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('profile.error'), t('profile.delete_error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate mastery rate
  const masteryRate = stats?.averageRating ? Math.round((stats.averageRating / 5) * 100) : 0;

  // Generate heatmap data from practice history
  const generateHeatmap = () => {
    if (!stats?.practiceHistory || stats.practiceHistory.length === 0) {
      return Array(140).fill({ count: 0 });
    }

    const last140Days = stats.practiceHistory.slice(-140);
    return last140Days.map(p => ({ count: p.count }));
  };

  const heatmap = generateHeatmap();

  const settingsMenuItems = [
    { id: 'profile' as const, icon: User, label: t('profile.menu_profile'), color: 'bg-blue-500' },
    { id: 'language' as const, icon: Languages, label: t('profile.menu_language'), color: 'bg-purple-500' },
    { id: 'interests' as const, icon: Heart, label: t('profile.menu_interests'), color: 'bg-pink-500' },
    { id: 'security' as const, icon: Lock, label: t('profile.menu_security'), color: 'bg-green-500' },
    { id: 'danger' as const, icon: Trash2, label: t('profile.menu_danger'), color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header with Avatar */}
      <header className="flex flex-col items-center">
        <div className="relative mb-6 group">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-purple-400 to-pink-500">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          {/* Upload Overlay */}
          <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="text-white" size={28} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
            />
          </label>

          {/* Animated Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1 rounded-full border border-dashed border-purple-400/50"
          />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{profile?.username || 'User'}</h1>
        {profile?.bio && (
          <p className="text-gray-500 text-sm mt-1 max-w-xs text-center">{profile.bio}</p>
        )}
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">
          {profile?.is_pro ? 'PRO' : 'FREE'} • {stats?.currentStreak || 0} {t('profile.day_streak')}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 glass rounded-full p-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${activeTab === 'profile'
              ? 'bg-white shadow-md text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('profile.tab_profile')}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${activeTab === 'settings'
              ? 'bg-white shadow-md text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('profile.tab_settings')}
          </button>
        </div>

        {activeTab === 'profile' && (
          <button
            onClick={handleLogout}
            className="mt-4 px-5 py-2 text-red-500 hover:bg-red-50 rounded-full flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            {t('profile.logout')}
          </button>
        )}
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Stats Grid */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<BookOpen size={20} />}
                label={t('profile.words_learned')}
                value={loadingStats ? '...' : (stats?.totalWordsLearned || 0).toLocaleString()}
                color="bg-blue-500"
              />
              <StatCard
                icon={<Flame size={20} />}
                label={t('profile.current_streak')}
                value={loadingStats ? '...' : `${stats?.currentStreak || 0} ${t('profile.days')}`}
                color="bg-orange-500"
              />
              <StatCard
                icon={<Star size={20} />}
                label={t('profile.avg_rating')}
                value={loadingStats ? '...' : `${stats?.averageRating || 0}/5`}
                color="bg-yellow-500"
              />
              <StatCard
                icon={<Target size={20} />}
                label={t('profile.decks_finished')}
                value={loadingStats ? '...' : (stats?.totalDecksCompleted || 0).toString()}
                color="bg-emerald-500"
              />
            </section>

            {/* 7-Day Activity Chart (Apple Health Style) */}
            <section className="glass p-8 rounded-[32px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-lg">{t('profile.learning_consistency')}</h2>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('profile.last_7_days')}</span>
              </div>

              {/* Bar Chart */}
              <div className="flex items-end justify-between gap-2 h-32 mb-4">
                {(() => {
                  // Get last 7 days from practiceHistory
                  const today = new Date();
                  const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const date = new Date(today);
                    date.setDate(date.getDate() - (6 - i));
                    return date.toISOString().split('T')[0];
                  });

                  // Get counts for each day
                  const dayData = last7Days.map(dateStr => {
                    const entry = stats?.practiceHistory?.find(h => h.date === dateStr);
                    return {
                      date: dateStr,
                      count: entry?.count || 0,
                      dayName: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
                    };
                  });

                  // Find max for scaling
                  const maxCount = Math.max(...dayData.map(d => d.count), 1);

                  return dayData.map((day, i) => {
                    const heightPercent = (day.count / maxCount) * 100;
                    const isToday = i === 6;

                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                        {/* Count label on top */}
                        {day.count > 0 && (
                          <span className="text-xs font-bold text-gray-600">{day.count}</span>
                        )}
                        {/* Bar */}
                        <div className="w-full flex-1 flex items-end">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(heightPercent, 4)}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className={`w-full rounded-t-lg ${day.count === 0
                                ? 'bg-gray-100'
                                : isToday
                                  ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                                  : 'bg-gradient-to-t from-blue-400 to-blue-300'
                              }`}
                            style={{ minHeight: day.count === 0 ? '4px' : undefined }}
                          />
                        </div>
                        {/* Day label */}
                        <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                          {day.dayName}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Summary */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.practiceHistory?.slice(-7).reduce((sum, h) => sum + h.count, 0) || 0}
                  </p>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{t('profile.cards_this_week')}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.practiceHistory?.slice(-7).filter(h => h.count > 0).length || 0}/7
                  </p>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{t('profile.days_active')}</p>
                </div>
              </div>
            </section>

            {/* Language Summary */}
            <section className="glass p-8 rounded-[32px]">
              <h2 className="font-bold text-lg mb-4">{t('profile.your_journey')}</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                  <span className="text-lg">{LANGUAGES.find(l => l.code === profile?.native_lang)?.flag || '🌐'}</span>
                  <span className="font-medium text-sm">{LANGUAGES.find(l => l.code === profile?.native_lang)?.name || 'Native'}</span>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full">
                  <span className="text-lg">{LANGUAGES.find(l => l.code === profile?.target_lang)?.flag || '🌐'}</span>
                  <span className="font-medium text-sm">{LANGUAGES.find(l => l.code === profile?.target_lang)?.name || 'Target'}</span>
                </div>
                <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                  {profile?.proficiency_level || 'B1'}
                </span>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid md:grid-cols-[240px,1fr] gap-6"
          >
            {/* Settings Menu */}
            <nav className="glass p-4 rounded-[24px] h-fit space-y-1">
              {settingsMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeSection === item.id
                    ? 'bg-white shadow-md'
                    : 'hover:bg-white/50'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center text-white`}>
                    <item.icon size={16} />
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Settings Content */}
            <div className="glass p-8 rounded-[32px]">
              <AnimatePresence mode="wait">
                {activeSection === 'profile' && (
                  <SettingsPanel key="profile" title={t('profile.section_profile')}>
                    <div className="space-y-6">
                      {/* Profile Picture */}
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              profile?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                          </div>
                          {uploadingAvatar && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                              <Camera size={16} />
                              {profile?.avatar_url ? t('profile.change_photo') : t('profile.upload_photo')}
                            </span>
                          </label>
                          {profile?.avatar_url && (
                            <button
                              onClick={async () => {
                                if (!user) return;
                                try {
                                  await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
                                  toast.success(t('profile.success'), t('profile.photo_removed'));
                                  if (refreshProfile) refreshProfile();
                                } catch (error) {
                                  toast.error(t('profile.error'), t('profile.remove_error'));
                                }
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={16} />
                              {t('profile.remove_photo')}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Username */}
                      <InputField
                        label={t('profile.username')}
                        value={editedUsername}
                        onChange={setEditedUsername}
                      />
                      <SaveButton onClick={handleSaveProfile} loading={isSaving} />
                    </div>
                  </SettingsPanel>
                )}

                {activeSection === 'language' && (
                  <SettingsPanel key="language" title={t('profile.section_language')}>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <SelectField
                          label={t('profile.native_lang')}
                          value={selectedNativeLang}
                          onChange={setSelectedNativeLang}
                          options={LANGUAGES.map(l => ({ value: l.code, label: `${l.flag} ${l.name}` }))}
                        />
                        <SelectField
                          label={t('profile.target_lang')}
                          value={selectedTargetLang}
                          onChange={setSelectedTargetLang}
                          options={LANGUAGES.map(l => ({ value: l.code, label: `${l.flag} ${l.name}` }))}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-3">{t('profile.level')}</label>
                        <div className="grid grid-cols-6 gap-2">
                          {LEVELS.map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => setSelectedLevel(lvl)}
                              className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${selectedLevel === lvl
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      <SaveButton onClick={handleSaveLanguage} loading={isSaving} />
                    </div>
                  </SettingsPanel>
                )}

                {activeSection === 'interests' && (
                  <SettingsPanel key="interests" title={t('profile.section_interests')}>
                    <div className="space-y-6">
                      <p className="text-sm text-gray-500">{t('profile.interests_desc')}</p>
                      <div className="grid grid-cols-4 gap-3">
                        {INTERESTS.map((interest) => (
                          <button
                            key={interest.id}
                            onClick={() => toggleInterest(interest.id)}
                            className={`p-3 rounded-xl border-2 transition-all text-center ${selectedInterests.includes(interest.id)
                              ? 'border-pink-500 bg-pink-50'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <span className="text-2xl block mb-1">{interest.emoji}</span>
                            <span className="text-xs font-medium">{interest.name}</span>
                          </button>
                        ))}
                      </div>
                      <SaveButton onClick={handleSaveInterests} loading={isSaving} />
                    </div>
                  </SettingsPanel>
                )}

                {activeSection === 'security' && (
                  <SettingsPanel key="security" title={t('profile.section_security')}>
                    <div className="space-y-5">
                      <InputField
                        label={t('profile.new_password')}
                        value={newPassword}
                        onChange={setNewPassword}
                        type="password"
                      />
                      <InputField
                        label={t('profile.confirm_password')}
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        type="password"
                      />
                      <button
                        onClick={handleChangePassword}
                        disabled={isSaving || !newPassword || newPassword !== confirmPassword}
                        className="w-full bg-gray-800 text-white py-3 rounded-xl font-medium hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? t('profile.updating') : t('profile.update_password')}
                      </button>
                    </div>
                  </SettingsPanel>
                )}

                {activeSection === 'danger' && (
                  <SettingsPanel key="danger" title={t('profile.section_danger')} danger>
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm">{t('profile.delete_warning')}</p>
                      <InputField
                        label={t('profile.type_delete')}
                        value={deleteConfirm}
                        onChange={setDeleteConfirm}
                        placeholder="DELETE"
                      />
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isSaving || deleteConfirm !== 'DELETE'}
                        className="w-full bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? t('profile.deleting') : t('profile.delete_account')}
                      </button>
                    </div>
                  </SettingsPanel>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-components
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className="glass p-5 rounded-[24px]">
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white mb-3`}>
      {icon}
    </div>
    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">{label}</span>
    <h3 className="text-xl font-bold">{value}</h3>
  </div>
);

const SettingsPanel: React.FC<{ title: string; children: React.ReactNode; danger?: boolean }> = ({ title, children, danger }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
  >
    <h3 className={`text-xl font-bold mb-6 ${danger ? 'text-red-600' : ''}`}>{title}</h3>
    {children}
  </motion.div>
);

const InputField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }> =
  ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      />
    </div>
  );

const SelectField: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }> =
  ({ label, value, onChange, options }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

const SaveButton: React.FC<{ onClick: () => void; loading: boolean }> = ({ onClick, loading }) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      <Save size={18} />
      {loading ? t('profile.saving') : t('profile.save_changes')}
    </button>
  );
};

export default Profile;

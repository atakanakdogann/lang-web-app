import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Award, History, Heart, Share2, Sparkles, LogOut, User, Mail, Lock, Camera, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

const Profile: React.FC = () => {
  const { profile, signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  // Settings states
  const [editedUsername, setEditedUsername] = useState(profile?.username || '');
  const [editedBio, setEditedBio] = useState(profile?.bio || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL 
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Reload page to show new avatar
      window.location.reload();
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload avatar');
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
        .update({
          username: editedUsername,
          bio: editedBio
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Profile updated successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      alert('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      alert(error.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate mock heatmap data
  const heatmap = Array.from({ length: 140 }, (_, i) => ({
    val: Math.floor(Math.random() * 5),
    active: Math.random() > 0.3
  }));

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col items-center">
        <div className="relative mb-6 group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-purple-400 to-pink-500">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          {/* Upload Button Overlay */}
          {activeTab === 'settings' && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="text-white" size={32} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </label>
          )}

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1 rounded-full border border-dashed border-blue-500/40"
          />
          {profile?.is_pro && (
            <div className="absolute bottom-1 right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-2 rounded-full shadow-lg">
              <Sparkles size={16} />
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight">{profile?.username || 'User'}</h1>
        {profile?.bio && (
          <p className="text-gray-600 text-sm mt-2 max-w-md text-center">{profile.bio}</p>
        )}
        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-2">
          {profile?.is_pro ? 'PRO MEMBER' : 'FREE TIER'} • {profile?.streak_days || 0} DAY STREAK
        </p>

        {/* Tabs */}
        <div className="flex gap-4 mt-8 mb-6 glass rounded-full p-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${activeTab === 'profile'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${activeTab === 'settings'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="flex gap-4">
            <button
              onClick={handleLogout}
              className="px-6 py-2 glass rounded-full flex items-center gap-2 hover:bg-red-500/20 transition-colors text-red-500 font-medium text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Total Words" value="2,482" sub="TOP 5% GLOBAL" color="text-blue-500" />
              <StatCard label="Longest Streak" value="142 Days" sub="NEVER MISSED A DAY" color="text-orange-500" />
              <StatCard label="Mastery Rate" value="94.2%" sub="EXCEPTIONAL" color="text-emerald-500" />
            </section>

            <section className="glass p-10 rounded-[48px] shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-lg font-bold tracking-tight">Learning Consistency</h2>
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Past 6 Months</span>
              </div>

              <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-4">
                {heatmap.map((h, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full transition-colors ${!h.active ? 'bg-black/[0.03]' :
                      h.val === 1 ? 'bg-blue-100' :
                        h.val === 2 ? 'bg-blue-300' :
                          h.val === 3 ? 'bg-blue-500' :
                            'bg-blue-700'
                      }`}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-2 items-center mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span>Less</span>
                <div className="w-2 h-2 rounded-full bg-black/5" />
                <div className="w-2 h-2 rounded-full bg-blue-200" />
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span>More</span>
              </div>
            </section>

            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-6">Earned Badges</h2>
              <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="glass p-8 rounded-[32px] flex flex-col items-center gap-3 shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                      <Sparkles size={32} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest">Early Adopter</span>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            {/* Profile Settings */}
            <div className="glass p-8 rounded-[32px]">
              <h3 className="text-lg font-bold mb-6">Profile Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Username</label>
                  <input
                    type="text"
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Bio</label>
                  <textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full bg-blue-500 text-white py-3 rounded-2xl font-medium hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Language Settings */}
            <div className="glass p-8 rounded-[32px]">
              <h3 className="text-lg font-bold mb-2">Language Settings</h3>
              <p className="text-sm text-gray-500 mb-6">
                Currently learning: <strong>{profile?.target_lang || 'Not set'}</strong> at <strong>{profile?.proficiency_level || 'B1'}</strong> level
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Native Language</label>
                    <select
                      defaultValue={profile?.native_lang || 'en'}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                      disabled
                    >
                      <option value="en">🇬🇧 English</option>
                      <option value="es">🇪🇸 Spanish</option>
                      <option value="fr">🇫🇷 French</option>
                      <option value="de">🇩🇪 German</option>
                      <option value="tr">🇹🇷 Turkish</option>
                      <option value="ja">🇯🇵 Japanese</option>
                      <option value="ko">🇰🇷 Korean</option>
                      <option value="zh">🇨🇳 Chinese</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Contact support to change</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Target Language</label>
                    <select
                      defaultValue={profile?.target_lang || 'es'}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                      disabled
                    >
                      <option value="en">🇬🇧 English</option>
                      <option value="es">🇪🇸 Spanish</option>
                      <option value="fr">🇫🇷 French</option>
                      <option value="de">🇩🇪 German</option>
                      <option value="tr">🇹🇷 Turkish</option>
                      <option value="ja">🇯🇵 Japanese</option>
                      <option value="ko">🇰🇷 Korean</option>
                      <option value="zh">🇨🇳 Chinese</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Contact support to change</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Proficiency Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => (
                      <div
                        key={lvl}
                        className={`p-3 rounded-xl border-2 text-center font-medium ${profile?.proficiency_level === lvl
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-500'
                          }`}
                      >
                        {lvl}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">Re-run onboarding to change level</p>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="glass p-8 rounded-[32px]">
              <h3 className="text-lg font-bold mb-6">Change Password</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={isSaving || !newPassword || newPassword !== confirmPassword}
                  className="w-full bg-gray-800 text-white py-3 rounded-2xl font-medium hover:bg-gray-900 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="glass p-8 rounded-[32px] border-2 border-red-200">
              <h3 className="text-lg font-bold mb-2 text-red-600">Danger Zone</h3>
              <p className="text-sm text-gray-600 mb-4">Once you delete your account, there is no going back.</p>
              <button className="px-6 py-3 bg-red-500 text-white rounded-2xl font-medium hover:bg-red-600 transition-all">
                Delete Account
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; sub: string; color: string }> = ({ label, value, sub, color }) => (
  <div className="glass p-8 rounded-[32px] border-white/50 shadow-sm">
    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-2">{label}</span>
    <h3 className={`text-3xl font-bold tracking-tight mb-1 ${color}`}>{value}</h3>
    <p className="text-[9px] font-bold tracking-[0.2em] text-gray-400">{sub}</p>
  </div>
);

export default Profile;

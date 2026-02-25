import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.local";
import { useUserProfile } from "../hooks/useUserProfile.local";
import { useAIPrompts } from "../hooks/useAIPrompts.local";
import { localUserProfile } from "../lib/localStorage";
import { AIPromptConfig } from "../lib/aiPrompts";

export default function Profile() {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile(user?.id);
  const { getPrompt, savePrompt, resetPrompt, getAllPromptConfigs, isCustomized, loading: promptsLoading } = useAIPrompts(user?.id);

  const [notifications, setNotifications] = useState(true);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Nickname editing state
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [nickname, setNickname] = useState("");

  // Avatar upload state
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // AI Prompts state
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<AIPromptConfig | null>(null);
  const [editingPrompt, setEditingPrompt] = useState("");
  const [promptSaveSuccess, setPromptSaveSuccess] = useState(false);

  const handleSaveApiKey = () => {
    if (!user || !apiKey.trim()) return;

    localUserProfile.update(user.id, {
      ai_api_key: apiKey.trim(),
      ai_service_provider: 'deepseek',
    });

    setShowApiKeyDialog(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleOpenApiKeyDialog = () => {
    setApiKey(profile?.ai_api_key || '');
    setShowApiKeyDialog(true);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  // Prompt management handlers
  const handleOpenPromptsDialog = () => {
    setShowPromptsDialog(true);
  };

  const handleEditPrompt = (config: AIPromptConfig) => {
    setSelectedPrompt(config);
    setEditingPrompt(getPrompt(config.key));
  };

  const handleSavePrompt = async () => {
    if (!selectedPrompt) return;

    const success = await savePrompt(selectedPrompt.key, editingPrompt);
    if (success) {
      setPromptSaveSuccess(true);
      setTimeout(() => setPromptSaveSuccess(false), 2000);
      setSelectedPrompt(null);
    }
  };

  const handleResetPrompt = async () => {
    if (!selectedPrompt) return;

    const success = await resetPrompt(selectedPrompt.key);
    if (success) {
      setPromptSaveSuccess(true);
      setTimeout(() => setPromptSaveSuccess(false), 2000);
      setSelectedPrompt(null);
    }
  };

  // Nickname editing handlers
  const handleOpenNicknameDialog = () => {
    setNickname(profile?.nickname || '');
    setShowNicknameDialog(true);
  };

  const handleSaveNickname = () => {
    if (!user || !nickname.trim()) return;

    localUserProfile.update(user.id, {
      nickname: nickname.trim(),
    });

    setShowNicknameDialog(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    window.location.reload(); // Refresh to show updated nickname
  };

  // Avatar upload handlers
  const handleOpenAvatarDialog = () => {
    setAvatarUrl(profile?.avatar_url || '');
    setShowAvatarDialog(true);
  };

  const handleSaveAvatar = () => {
    if (!user || !avatarUrl.trim()) return;

    // Validate URL format
    try {
      new URL(avatarUrl);
    } catch {
      alert('Please enter a valid URL');
      return;
    }

    localUserProfile.update(user.id, {
      avatar_url: avatarUrl.trim(),
    });

    setShowAvatarDialog(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    window.location.reload(); // Refresh to show updated avatar
  };

  // Password change handlers
  const handleOpenPasswordDialog = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordDialog(true);
  };

  const handleSavePassword = () => {
    if (!user) return;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    // In a real app, you would verify currentPassword against stored password
    // For now, we'll just update to the new password
    localUserProfile.update(user.id, {
      password: newPassword, // Note: In production, this should be hashed
    });

    setShowPasswordDialog(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      <div className="h-12 w-full bg-white flex items-end justify-between px-6 pb-2 text-xs font-medium text-gray-900 z-10">
        <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        <div className="flex gap-1.5 items-center">
          <span className="material-symbols-outlined text-[16px] font-bold">signal_cellular_alt</span>
          <span className="material-symbols-outlined text-[16px] font-bold">wifi</span>
          <span className="material-symbols-outlined text-[18px] font-bold">battery_full</span>
        </div>
      </div>

      <header className="px-4 py-3 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-600">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-[18px] font-bold text-gray-800">Settings</h1>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto bg-[#F9FAFB] pb-24">
        <div className="bg-white m-4 p-6 rounded-[12px] shadow-sm flex flex-col items-center">
          <div
            onClick={handleOpenAvatarDialog}
            className="relative mb-3 group cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-br from-[#9DC5EF] to-[#FFB3C1]">
              {profile?.avatar_url ? (
                <img
                  alt="User Avatar"
                  className="w-full h-full rounded-full object-cover border-[3px] border-white"
                  src={profile.avatar_url}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold border-[3px] border-white">
                  {profile?.nickname?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md border border-gray-100">
              <span className="material-symbols-outlined text-[16px] text-gray-500 block">edit</span>
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-0.5">{profile?.nickname || 'User'}</h2>
          <p className="text-sm text-gray-500 font-normal">{user?.phone || 'N/A'}</p>
          <div className="mt-4 flex gap-3">
            <span className="px-3 py-1 bg-green-50 text-[#A8C3A9] text-xs font-medium rounded-full border border-green-100">Free Plan</span>
            <span className="px-3 py-1 bg-blue-50 text-[#9DC5EF] text-xs font-medium rounded-full border border-blue-100">Joined 2026</span>
          </div>
        </div>

        <div className="mx-4 mb-20 space-y-6">
          <section>
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Account</h3>
            <div className="bg-white rounded-[12px] shadow-sm overflow-hidden divide-y divide-gray-50">
              <button
                onClick={handleOpenNicknameDialog}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-[#E8C996]">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Edit Nickname</span>
                </div>
                <span className="material-symbols-outlined text-gray-300 text-[20px] group-hover:text-gray-400">chevron_right</span>
              </button>
              <button
                onClick={handleOpenAvatarDialog}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#B8C5D0]">
                    <span className="material-symbols-outlined text-[18px]">account_circle</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Upload Avatar</span>
                </div>
                <span className="material-symbols-outlined text-gray-300 text-[20px] group-hover:text-gray-400">chevron_right</span>
              </button>
              <button
                onClick={handleOpenPasswordDialog}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[#9DC5EF]">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Change Password</span>
                </div>
                <span className="material-symbols-outlined text-gray-300 text-[20px] group-hover:text-gray-400">chevron_right</span>
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Integration</h3>
            <div className="bg-white rounded-[12px] shadow-sm overflow-hidden divide-y divide-gray-50">
              <button
                onClick={handleOpenApiKeyDialog}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-[#D4A5A5]">
                    <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700">AI API Key (DeepSeek)</span>
                    <span className="text-[10px] text-gray-400">
                      {profile?.ai_api_key ? `Configured ••••${profile.ai_api_key.slice(-4)}` : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-300 text-[20px] group-hover:text-gray-400">chevron_right</span>
              </button>

              <button
                onClick={handleOpenPromptsDialog}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[#A891D3]">
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700">AI Prompts</span>
                    <span className="text-[10px] text-gray-400">
                      Customize AI behavior and responses
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-300 text-[20px] group-hover:text-gray-400">chevron_right</span>
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Preferences</h3>
            <div className="bg-white rounded-[12px] shadow-sm overflow-hidden">
              <div className="w-full px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <span className="material-symbols-outlined text-[18px]">notifications</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Push Notifications</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications}
                    onChange={() => setNotifications(!notifications)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#9DC5EF] peer-checked:to-[#FFB3C1]"></div>
                </label>
              </div>
            </div>
          </section>

          <button
            onClick={handleLogout}
            className="w-full bg-white rounded-[8px] shadow-sm px-5 py-4 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors active:scale-[0.99] transform duration-100 mt-4 border border-gray-100"
          >
            <span className="material-symbols-outlined text-[20px] text-red-500">logout</span>
            <span className="text-sm font-bold text-red-500">Logout</span>
          </button>
          
          <p className="text-center text-[10px] text-gray-400 mt-6 mb-8">Version 1.0.2 (Build 240)</p>
        </div>
      </main>

      {/* API Key Configuration Dialog */}
      {showApiKeyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[12px] p-6 max-w-sm mx-4 shadow-xl w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Configure AI API Key</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">DeepSeek API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your key from <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">DeepSeek Platform</a>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApiKeyDialog(false)}
                className="flex-1 h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKey.trim()}
                className="flex-1 h-10 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="font-medium">API Key Saved!</span>
          </div>
        </div>
      )}

      {/* Prompt Success Toast */}
      {promptSaveSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="font-medium">Prompt Saved!</span>
          </div>
        </div>
      )}

      {/* AI Prompts List Dialog */}
      {showPromptsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] p-6 max-w-lg w-full shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">AI Prompts Management</h3>
              <button
                onClick={() => setShowPromptsDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Customize how AI analyzes and responds to your content. Each prompt controls different AI features.
            </p>

            <div className="space-y-3">
              {getAllPromptConfigs().map((config) => (
                <button
                  key={config.key}
                  onClick={() => handleEditPrompt(config)}
                  className="w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">{config.name}</span>
                        {isCustomized(config.key) && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-medium rounded-full">
                            Customized
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 text-[18px] flex-shrink-0">
                      edit
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowPromptsDialog(false)}
                className="w-full h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Editor Dialog */}
      {selectedPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[12px] p-6 max-w-2xl w-full shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{selectedPrompt.name}</h3>
              <button
                onClick={() => setSelectedPrompt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">{selectedPrompt.description}</p>

            <div className="flex-1 overflow-y-auto mb-4">
              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter your custom prompt..."
              />
            </div>

            {isCustomized(selectedPrompt.key) && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[18px]">info</span>
                <p className="text-xs text-blue-700">
                  This prompt has been customized. Click "Reset to Default" to restore the original prompt.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {isCustomized(selectedPrompt.key) && (
                <button
                  onClick={handleResetPrompt}
                  disabled={promptsLoading}
                  className="flex-1 h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Reset to Default
                </button>
              )}
              <button
                onClick={() => setSelectedPrompt(null)}
                className="flex-1 h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={promptsLoading || !editingPrompt.trim()}
                className="flex-1 h-10 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium disabled:opacity-50"
              >
                {promptsLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nickname Edit Dialog */}
      {showNicknameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[12px] p-6 max-w-sm mx-4 shadow-xl w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Edit Nickname</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNicknameDialog(false)}
                className="flex-1 h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNickname}
                disabled={!nickname.trim()}
                className="flex-1 h-10 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Dialog */}
      {showAvatarDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[12px] p-6 max-w-sm mx-4 shadow-xl w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Upload Avatar</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the URL of your avatar image
              </p>
              {avatarUrl && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAvatarDialog(false)}
                className="flex-1 h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAvatar}
                disabled={!avatarUrl.trim()}
                className="flex-1 h-10 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[12px] p-6 max-w-sm mx-4 shadow-xl w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Change Password</h3>
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500">
                Password must be at least 6 characters long
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPasswordDialog(false)}
                className="flex-1 h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
                className="flex-1 h-10 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

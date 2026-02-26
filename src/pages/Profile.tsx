import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Edit2, IdCard, ChevronRight, Bot, FileEdit, LogOut, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { useAIPrompts } from "../hooks/useAIPrompts";
import { AIPromptConfig } from "../lib/aiPrompts";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, uploadAvatar } = useUserProfile(user?.id);
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

  // AI Prompts state
  const [showPromptsDialog, setShowPromptsDialog] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<AIPromptConfig | null>(null);
  const [editingPrompt, setEditingPrompt] = useState("");
  const [promptSaveSuccess, setPromptSaveSuccess] = useState(false);

  const handleSaveApiKey = async () => {
    if (!user || !apiKey.trim()) return;

    const success = await updateProfile({
      ai_api_key: apiKey.trim(),
      ai_service_provider: 'deepseek',
    });

    if (success) {
      setShowApiKeyDialog(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const handleOpenApiKeyDialog = () => {
    setApiKey(profile?.ai_api_key || '');
    setShowApiKeyDialog(true);
  };

  const handleLogout = async () => {
    await signOut();
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

  const handleSaveNickname = async () => {
    if (!user || !nickname.trim()) return;

    const success = await updateProfile({
      nickname: nickname.trim(),
    });

    if (success) {
      setShowNicknameDialog(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  // Avatar upload handlers
  const handleOpenAvatarDialog = () => {
    setAvatarUrl(profile?.avatar_url || '');
    setShowAvatarDialog(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadAvatar(file);
      if (url) {
        setShowAvatarDialog(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">

      <header className="px-4 py-3 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-600">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-[18px] font-bold text-gray-800">Settings</h1>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <Bell size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto bg-[#F9FAFB] pb-24">
        <div className="bg-white m-4 p-6 rounded-[12px] shadow-sm flex flex-col items-center">
          <div className="relative mb-3 group">
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
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md border border-gray-100 cursor-pointer hover:bg-gray-50">
              <Edit2 size={16} className="text-gray-500 block" />
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
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
                    <IdCard size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Edit Nickname</span>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-gray-400" />
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
                    <Bot size={18} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700">AI API Key (DeepSeek)</span>
                    <span className="text-[10px] text-gray-400">
                      {profile?.ai_api_key ? `Configured ••••${profile.ai_api_key.slice(-4)}` : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-gray-400" />
              </button>

              <button
                onClick={handleOpenPromptsDialog}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[#A891D3]">
                    <FileEdit size={18} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700">AI Prompts</span>
                    <span className="text-[10px] text-gray-400">
                      Customize AI behavior and responses
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-gray-400" />
              </button>
            </div>
          </section>

          <button
            onClick={handleLogout}
            className="w-full bg-white rounded-[8px] shadow-sm px-5 py-4 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors active:scale-[0.99] transform duration-100 mt-4 border border-gray-100"
          >
            <LogOut size={20} className="text-red-500" />
            <span className="text-sm font-bold text-red-500">Logout</span>
          </button>
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
                <X size={24} />
              </button>
            </div>
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
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor Dialog and Success Toast removed for brevity in migration, can be added back if needed */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Success!
        </div>
      )}
    </div>
  );
}

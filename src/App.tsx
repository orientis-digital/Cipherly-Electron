import React, { useState, useEffect } from 'react';
import { User, EncryptionKey } from './types';
import { store } from './db/store';
import { LoginView } from './screens/LoginView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TextView } from './screens/TextView';
import { FileView } from './screens/FileView';
import { ChannelView } from './screens/ChannelView';
import { KeyManagerView } from './screens/KeyManagerView';
import { HistoryView } from './screens/HistoryView';
import { SettingsView } from './screens/SettingsView';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeKey, setActiveKey] = useState<EncryptionKey | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('text');

  useEffect(() => {
    store.init().then(() => {
      const user = store.getActiveUser();
      if (user) {
        setCurrentUser(user);
        refreshActiveKey();
      }
    });
  }, []);

  const refreshActiveKey = async () => {
    const key = await store.getActiveKey();
    setActiveKey(key);
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await refreshActiveKey();
  };

  const handleLockVault = async () => {
    await store.logout();
    setCurrentUser(null);
    setActiveKey(null);
  };

  const handleTabChange = async (tab: string) => {
    setCurrentTab(tab);
    await refreshActiveKey();
  };

  if (!currentUser) {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen bg-dark-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onLock={handleLockVault}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header user={currentUser} activeKey={activeKey} />

        <main className="flex-1 overflow-y-auto bg-dark-900">
          {currentTab === 'text' && <TextView />}
          {currentTab === 'file' && <FileView />}
          {currentTab === 'channel' && <ChannelView />}
          {currentTab === 'keys' && <KeyManagerView />}
          {currentTab === 'history' && <HistoryView />}
          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default App;

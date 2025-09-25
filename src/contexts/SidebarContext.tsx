import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

interface SidebarContextType {
  isSidebarVisible: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  // On mobile, sidebar starts hidden. On desktop, it starts visible.
  const [isSidebarVisible, setIsSidebarVisible] = useState(!isMobile);

  // Auto-hide sidebar when switching to mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarVisible(false);
    } else {
      setIsSidebarVisible(true);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarVisible(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarVisible(false);
  };

  const value = {
    isSidebarVisible,
    isMobile,
    toggleSidebar,
    closeSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
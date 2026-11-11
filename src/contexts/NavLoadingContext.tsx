import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavLoadingContextType {
  isNavigating: boolean;
  startNavigating: (targetPath?: string) => void;
  stopNavigating: () => void;
}

const NavLoadingContext = createContext<NavLoadingContextType>({
  isNavigating: false,
  startNavigating: () => {},
  stopNavigating: () => {},
});

export const useNavLoading = () => useContext(NavLoadingContext);

export const NavLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();

  // Whenever location changes (new route finished resolving/rendering), turn off navigation loading indicator
  useEffect(() => {
    setIsNavigating(false);
  }, [location.pathname, location.search]);

  const startNavigating = (targetPath?: string) => {
    // If user clicks the exact route they are currently on, don't show loading
    if (targetPath && (targetPath === location.pathname || targetPath === location.pathname + location.search)) {
      return;
    }
    setIsNavigating(true);
  };

  const stopNavigating = () => {
    setIsNavigating(false);
  };

  return (
    <NavLoadingContext.Provider value={{ isNavigating, startNavigating, stopNavigating }}>
      {children}
    </NavLoadingContext.Provider>
  );
};

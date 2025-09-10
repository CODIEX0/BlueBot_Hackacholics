import React from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
}

const MobileAuthContext = React.createContext<AuthContextValue>({ isAuthenticated: false });

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  return (
    <MobileAuthContext.Provider value={{ isAuthenticated: false }}>
      {children}
    </MobileAuthContext.Provider>
  );
};

export const useMobileAuth = () => React.useContext(MobileAuthContext);

export default MobileAuthContext;

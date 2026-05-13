import { createContext, useContext, useState, ReactNode } from "react";

type RoleContextType = {
  isManager: boolean;
  setIsManager: (isManager: boolean) => void;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [isManager, setIsManager] = useState(false);
  return (
    <RoleContext.Provider value={{ isManager, setIsManager }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

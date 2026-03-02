import React, { createContext, useContext, useState } from 'react';

const GuideContext = createContext({ openGuide: () => {} });

export function GuideProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <GuideContext.Provider value={{ open, openGuide: () => setOpen(true), closeGuide: () => setOpen(false) }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  return useContext(GuideContext);
}
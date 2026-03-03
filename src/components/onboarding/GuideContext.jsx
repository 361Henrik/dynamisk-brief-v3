import React, { createContext, useContext, useState, useEffect } from 'react';

const GuideContext = createContext({ open: false, openGuide: () => {}, closeGuide: () => {} });

const STORAGE_KEY = 'briefEditorGuideSeen';

export function GuideProvider({ children, currentPageName }) {
  const [open, setOpen] = useState(false);

  // Auto-open only when first entering BriefEditor
  useEffect(() => {
    if (currentPageName === 'BriefEditor' && localStorage.getItem(STORAGE_KEY) !== 'true') {
      setOpen(true);
    }
  }, [currentPageName]);

  const openGuide = () => setOpen(true);

  const closeGuide = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <GuideContext.Provider value={{ open, openGuide, closeGuide }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  return useContext(GuideContext);
}
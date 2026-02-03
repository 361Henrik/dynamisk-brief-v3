/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminBriefmal from './pages/AdminBriefmal';
import AdminKnowledgeBase from './pages/AdminKnowledgeBase';
import AdminSystemInstructions from './pages/AdminSystemInstructions';
import AdminThemes from './pages/AdminThemes';
import AdminUsers from './pages/AdminUsers';
import BriefEditor from './pages/BriefEditor';
import BriefList from './pages/BriefList';
import HelpInstructions from './pages/HelpInstructions';
import Home from './pages/Home';
import NewBrief from './pages/NewBrief';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminBriefmal": AdminBriefmal,
    "AdminKnowledgeBase": AdminKnowledgeBase,
    "AdminSystemInstructions": AdminSystemInstructions,
    "AdminThemes": AdminThemes,
    "AdminUsers": AdminUsers,
    "BriefEditor": BriefEditor,
    "BriefList": BriefList,
    "HelpInstructions": HelpInstructions,
    "Home": Home,
    "NewBrief": NewBrief,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
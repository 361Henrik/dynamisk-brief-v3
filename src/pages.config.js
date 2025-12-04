import Home from './pages/Home';
import BriefList from './pages/BriefList';
import NewBrief from './pages/NewBrief';
import BriefEditor from './pages/BriefEditor';
import AdminUsers from './pages/AdminUsers';
import AdminThemes from './pages/AdminThemes';
import AdminKnowledgeBase from './pages/AdminKnowledgeBase';
import AdminSystemInstructions from './pages/AdminSystemInstructions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "BriefList": BriefList,
    "NewBrief": NewBrief,
    "BriefEditor": BriefEditor,
    "AdminUsers": AdminUsers,
    "AdminThemes": AdminThemes,
    "AdminKnowledgeBase": AdminKnowledgeBase,
    "AdminSystemInstructions": AdminSystemInstructions,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
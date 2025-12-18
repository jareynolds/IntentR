import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-container">
      <Header onMenuToggle={toggleSidebar} />
      <div className="app-main">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="app-content">
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;

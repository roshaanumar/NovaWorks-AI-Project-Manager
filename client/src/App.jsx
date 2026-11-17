import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProjectDetails } from './pages/ProjectDetails';
import { TranscriptPage } from './pages/TranscriptPage';
import { AgentTasks } from './pages/AgentTasks';
import { TeamDirectory } from './pages/TeamDirectory';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Set default view on user change
  useEffect(() => {
    if (user) {
      if (user.role === 'AGENT') {
        setCurrentView('tasks');
      } else {
        setCurrentView('projects');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-lg shadow-primary/20 animate-pulse mb-4">
          <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
        </div>
        <p className="text-sm font-semibold text-on-surface tracking-tight">Initializing NovaWorks CRM...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('project-details');
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setCurrentView('projects');
  };

  const handleProjectCreated = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('project-details');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-1 pb-16">
        {currentView === 'projects' && (
          <AdminDashboard
            onSelectProject={handleSelectProject}
            onNavigateToTranscript={() => setCurrentView('transcript')}
          />
        )}

        {currentView === 'project-details' && (
          <ProjectDetails
            projectId={selectedProjectId}
            onBack={handleBackToProjects}
          />
        )}

        {currentView === 'transcript' && user.role === 'ADMIN' && (
          <TranscriptPage onProjectCreated={handleProjectCreated} />
        )}

        {currentView === 'tasks' && <AgentTasks />}

        {currentView === 'team' && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <TeamDirectory />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StartPageLayout } from './StartPageLayout';

export const DiscoveryStart: React.FC = () => {
  const navigate = useNavigate();

  const handleBegin = () => {
    navigate('/wizard/discovery');
  };

  const handleSkip = () => {
    navigate('/wizard/discovery');
  };

  const illustration = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );

  const highlights = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      title: 'Code Analysis',
      description: 'Examine existing application structure, patterns, and architecture.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
      title: 'Capability Identification',
      description: 'Find implicit business functions within the existing system.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      title: 'Documentation',
      description: 'Create capability and enabler documents from existing code.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
      title: 'Dependency Mapping',
      description: 'Understand component relationships and system architecture.',
    },
  ];

  return (
    <StartPageLayout
      title="Discovery Phase"
      subtitle="Understanding what already exists"
      description={[
        'The Discovery phase is for analyzing existing applications that weren\'t built with IntentR. You\'ll examine the codebase, document its structure, and create capability/enabler specifications that capture what already exists.',
        'During this phase, you will analyze existing code structure and patterns, identify implicit capabilities in the system, document current functionality as capabilities, and create enabler specifications from existing code.',
        'Discovery is documentation-only. You will NOT modify code during this phase. The goal is to create a specification layer that enables future enhancements using INTENT methodology.',
      ]}
      highlights={highlights}
      illustration={illustration}
      onBegin={handleBegin}
      beginLabel="Begin Discovery"
      showSkip={true}
      onSkip={handleSkip}
      accentColor="orange"
    />
  );
};

export default DiscoveryStart;

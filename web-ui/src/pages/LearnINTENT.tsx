import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

interface Section {
  id: string;
  title: string;
  icon: string;
}

const SECTIONS: Section[] = [
  { id: 'philosophy', title: 'Philosophy', icon: '💡' },
  { id: 'principles', title: 'Principles', icon: '📐' },
  { id: 'framework', title: 'Framework', icon: '🔄' },
  { id: 'platform', title: 'Platform', icon: '🏗️' },
  { id: 'manifesto', title: 'Manifesto', icon: '📜' },
];

const PRINCIPLES = [
  {
    number: 1,
    title: 'Intent precedes implementation',
    description: 'All systems begin with human decisions. Code is an outcome, not the source of truth.',
    insight: 'If intent is unclear, execution will amplify the error.',
  },
  {
    number: 2,
    title: 'Specification is a first-class artifact',
    description: 'Specifications are not documentation; they are executable inputs to system creation.',
    insight: 'What cannot be specified precisely cannot be reliably built or evolved.',
  },
  {
    number: 3,
    title: 'Notation over narration',
    description: 'Natural language explains; notation constrains. INTENT favors structured, machine-interpretable notation over prose.',
    insight: 'Precision is kindness to both humans and machines.',
  },
  {
    number: 4,
    title: 'Humans decide, AI helps humans execute',
    description: 'Human expertise defines what and why. AI systems optimize how and how fast.',
    insight: 'Authority stays with humans; leverage comes from machines.',
  },
  {
    number: 5,
    title: 'Derivation over construction',
    description: 'Systems should be derived from intent, not assembled by hand.',
    insight: 'Reproducibility beats craftsmanship at scale.',
  },
  {
    number: 6,
    title: 'Precision before velocity',
    description: 'Speed emerges from clarity, not shortcuts.',
    insight: 'Ambiguity is the true bottleneck of modern engineering.',
  },
  {
    number: 7,
    title: 'Transformation is continuous',
    description: 'Intent must survive change—of code, teams, tools, and models.',
    insight: 'A system that cannot preserve intent cannot scale.',
  },
];

const LIFECYCLE_PHASES = [
  {
    number: 1,
    title: 'Intent Declaration',
    description: 'Human intent is explicitly declared before any implementation.',
    examples: [
      'Conceptual idea, vision, strategy',
      'Architectural intent',
      'Behavioral intent',
      'Constraints, invariants, non-goals',
      'Success criteria',
    ],
  },
  {
    number: 2,
    title: 'Formal Specification',
    description: 'Intent is captured as engineering-grade notation, not prose.',
    characteristics: ['Structured', 'Versioned', 'Machine-interpretable', 'Testable'],
    examples: [
      'Interface contracts',
      'Capability definitions',
      'Domain models',
      'Policy-as-code',
      'System invariants',
    ],
    note: 'Specifications are the source of truth.',
  },
  {
    number: 3,
    title: 'System Derivation',
    description: 'AI systems derive artifacts from specifications.',
    artifacts: ['Code', 'Tests', 'Infrastructure', 'Documentation', 'Validation harnesses'],
    note: 'Humans do not "build" — they approve derivations.',
  },
  {
    number: 4,
    title: 'Continuous Validation',
    description: 'Derived systems are continuously validated against intent.',
    checks: [
      'Spec conformance',
      'Behavioral correctness',
      'Regression against declared intent',
      'Drift detection',
    ],
    note: 'Drift from intent is treated as a defect.',
  },
  {
    number: 5,
    title: 'Intent Evolution',
    description: 'Change happens by modifying intent and specification, not by patching outputs.',
    enables: [
      'Safe refactoring',
      'Controlled system evolution',
      'AI model changes without rewriting systems',
    ],
    note: 'Systems evolve by revising intent, not chasing side effects.',
  },
];

export const LearnINTENT: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('philosophy');
  const [expandedPrinciple, setExpandedPrinciple] = useState<number | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [readSections, setReadSections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('intent_read_sections');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Save read sections to localStorage
  useEffect(() => {
    localStorage.setItem('intent_read_sections', JSON.stringify([...readSections]));
  }, [readSections]);

  // Track which section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            setActiveSection(sectionId);
            setReadSections((prev) => new Set([...prev, sectionId]));
          }
        });
      },
      { threshold: 0.3 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth' });
  };

  const progress = Math.round((readSections.size / SECTIONS.length) * 100);

  return (
    <div className="learn-intent-page">
      <style>{`
        .learn-intent-page {
          display: flex;
          min-height: 100vh;
          background: var(--color-grey-50);
        }

        .learn-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 280px;
          background: white;
          border-right: 1px solid var(--color-grey-200);
          padding: 24px;
          display: flex;
          flex-direction: column;
          z-index: 100;
        }

        .sidebar-header {
          margin-bottom: 24px;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: var(--color-grey-600);
          font-size: 14px;
          cursor: pointer;
          padding: 8px 0;
          transition: color 0.15s ease;
        }

        .back-button:hover {
          color: var(--color-blue-600);
        }

        .sidebar-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--color-grey-900);
          margin: 16px 0 8px;
        }

        .sidebar-subtitle {
          font-size: 13px;
          color: var(--color-grey-500);
          line-height: 1.4;
        }

        .progress-section {
          margin-bottom: 24px;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--color-grey-600);
          margin-bottom: 8px;
        }

        .progress-bar {
          height: 6px;
          background: var(--color-grey-200);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-blue-500), var(--color-purple-500));
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .nav-list {
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-bottom: 4px;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }

        .nav-item:hover {
          background: var(--color-grey-50);
        }

        .nav-item.active {
          background: var(--color-blue-50);
          color: var(--color-blue-700);
        }

        .nav-icon {
          font-size: 20px;
        }

        .nav-text {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-grey-700);
        }

        .nav-item.active .nav-text {
          color: var(--color-blue-700);
        }

        .nav-check {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        .nav-check.completed {
          background: var(--color-green-500);
          color: white;
        }

        .nav-check.pending {
          background: var(--color-grey-200);
          color: var(--color-grey-400);
        }

        .learn-content {
          margin-left: 280px;
          flex: 1;
          padding: 40px 60px;
          max-width: 900px;
        }

        .content-section {
          margin-bottom: 80px;
          scroll-margin-top: 40px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .section-icon {
          font-size: 40px;
        }

        .section-title {
          font-size: 32px;
          font-weight: 700;
          color: var(--color-grey-900);
          margin: 0;
        }

        .doctrine-box {
          background: var(--color-grey-100);
          color: var(--color-grey-900);
          padding: 32px;
          border-radius: 16px;
          margin-bottom: 32px;
        }

        .doctrine-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--color-grey-600);
          margin-bottom: 12px;
        }

        .doctrine-text {
          font-size: 20px;
          font-weight: 500;
          line-height: 1.5;
          margin: 0;
        }

        .acronym-box {
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .acronym-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-grey-900);
          margin: 0 0 16px;
        }

        .acronym-breakdown {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .acronym-letter {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--color-blue-50);
          border-radius: 24px;
        }

        .letter {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-blue-600);
        }

        .letter-word {
          font-size: 14px;
          color: var(--color-grey-700);
        }

        .content-text {
          font-size: 16px;
          line-height: 1.7;
          color: var(--color-grey-700);
          margin-bottom: 24px;
        }

        .content-text strong {
          color: var(--color-grey-900);
        }

        .strengths-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .strength-card {
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 10px;
          padding: 20px;
        }

        .strength-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-grey-900);
          margin: 0 0 8px;
        }

        .strength-text {
          font-size: 13px;
          color: var(--color-grey-600);
          line-height: 1.5;
          margin: 0;
        }

        /* Principles Section */
        .principles-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .principle-card {
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .principle-card:hover {
          border-color: var(--color-blue-300);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .principle-card.expanded {
          border-color: var(--color-blue-400);
        }

        .principle-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          cursor: pointer;
        }

        .principle-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-blue-500), var(--color-purple-500));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .principle-title {
          flex: 1;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .principle-arrow {
          color: var(--color-grey-400);
          transition: transform 0.2s ease;
        }

        .principle-card.expanded .principle-arrow {
          transform: rotate(180deg);
        }

        .principle-content {
          padding: 0 24px 24px;
          border-top: 1px solid var(--color-grey-100);
          margin-top: -1px;
        }

        .principle-description {
          font-size: 15px;
          color: var(--color-grey-700);
          line-height: 1.6;
          margin: 20px 0 16px;
        }

        .principle-insight {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: var(--color-blue-50);
          border-radius: 8px;
        }

        .insight-icon {
          font-size: 20px;
        }

        .insight-text {
          font-size: 14px;
          color: var(--color-blue-800);
          font-style: italic;
          margin: 0;
        }

        /* Framework Section */
        .lifecycle-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 24px;
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 12px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .flow-step {
          padding: 10px 20px;
          background: var(--color-blue-50);
          color: var(--color-blue-700);
          font-weight: 600;
          font-size: 14px;
          border-radius: 24px;
        }

        .flow-arrow {
          color: var(--color-grey-400);
          font-size: 20px;
        }

        .phase-card {
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 12px;
          margin-bottom: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .phase-card:hover {
          border-color: var(--color-blue-300);
        }

        .phase-card.expanded {
          border-color: var(--color-blue-400);
        }

        .phase-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          cursor: pointer;
        }

        .phase-number {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--color-blue-600);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .phase-info {
          flex: 1;
        }

        .phase-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-grey-900);
          margin: 0 0 4px;
        }

        .phase-desc {
          font-size: 13px;
          color: var(--color-grey-500);
          margin: 0;
        }

        .phase-arrow {
          color: var(--color-grey-400);
          transition: transform 0.2s ease;
        }

        .phase-card.expanded .phase-arrow {
          transform: rotate(180deg);
        }

        .phase-content {
          padding: 0 24px 24px;
          border-top: 1px solid var(--color-grey-100);
        }

        .phase-list-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--color-grey-500);
          margin: 20px 0 12px;
        }

        .phase-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .phase-tag {
          padding: 6px 12px;
          background: var(--color-grey-100);
          border-radius: 16px;
          font-size: 13px;
          color: var(--color-grey-700);
        }

        .phase-note {
          margin-top: 16px;
          padding: 12px 16px;
          background: var(--color-green-50);
          border-radius: 8px;
          font-size: 14px;
          color: var(--color-green-800);
          font-weight: 500;
        }

        /* Comparison Table */
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin: 32px 0;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--color-grey-200);
        }

        .comparison-table th,
        .comparison-table td {
          padding: 16px 20px;
          text-align: left;
          border-bottom: 1px solid var(--color-grey-100);
        }

        .comparison-table th {
          background: var(--color-grey-50);
          font-size: 13px;
          font-weight: 600;
          color: var(--color-grey-600);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .comparison-table td {
          font-size: 14px;
          color: var(--color-grey-700);
        }

        .comparison-table tr:last-child td {
          border-bottom: none;
        }

        .comparison-table td:first-child {
          font-weight: 500;
          color: var(--color-grey-900);
        }

        .comparison-table td:last-child {
          color: var(--color-blue-700);
          font-weight: 500;
        }

        /* Platform Section */
        .platform-box {
          background: linear-gradient(135deg, var(--color-purple-50), var(--color-blue-50));
          border: 1px solid var(--color-purple-200);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
        }

        .platform-tagline {
          font-size: 14px;
          color: var(--color-purple-600);
          font-weight: 600;
          margin: 0 0 12px;
        }

        .platform-statement {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-grey-900);
          line-height: 1.4;
          margin: 0 0 24px;
        }

        .platform-responsibilities {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .responsibility-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          color: var(--color-grey-700);
        }

        .responsibility-icon {
          font-size: 18px;
        }

        /* Manifesto Section */
        .manifesto-intro {
          font-size: 18px;
          line-height: 1.7;
          color: var(--color-grey-800);
          margin-bottom: 32px;
        }

        .belief-section {
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .belief-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-grey-900);
          margin: 0 0 16px;
        }

        .belief-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .belief-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          font-size: 15px;
          color: var(--color-grey-700);
          line-height: 1.5;
          border-bottom: 1px solid var(--color-grey-100);
        }

        .belief-list li:last-child {
          border-bottom: none;
        }

        .belief-list li::before {
          content: "→";
          color: var(--color-blue-500);
          font-weight: bold;
        }

        .call-to-action {
          background: var(--color-grey-900);
          color: white;
          padding: 32px;
          border-radius: 16px;
          margin-top: 32px;
        }

        .cta-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 16px;
        }

        .cta-conditions {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
        }

        .cta-conditions li {
          padding: 8px 0;
          font-size: 15px;
          opacity: 0.9;
        }

        .cta-conditions li::before {
          content: "If you believe that ";
          opacity: 0.7;
        }

        .cta-statement {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-blue-300);
          margin: 0;
        }

        .cta-button {
          margin-top: 24px;
        }

        @media (max-width: 900px) {
          .learn-sidebar {
            display: none;
          }

          .learn-content {
            margin-left: 0;
            padding: 24px;
          }
        }
      `}</style>

      {/* Sidebar Navigation */}
      <aside className="learn-sidebar">
        <div className="sidebar-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Welcome
          </button>
          <h2 className="sidebar-title">Learn INTENT</h2>
          <p className="sidebar-subtitle">
            Understanding the philosophy behind intent-centered engineering
          </p>
        </div>

        <div className="progress-section">
          <div className="progress-label">
            <span>Your Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <nav className="nav-list">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => scrollToSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-text">{section.title}</span>
              <span className={`nav-check ${readSections.has(section.id) ? 'completed' : 'pending'}`}>
                {readSections.has(section.id) ? '✓' : '○'}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="learn-content">
        {/* Philosophy Section */}
        <section
          id="philosophy"
          className="content-section"
          ref={(el) => (sectionRefs.current['philosophy'] = el)}
        >
          <div className="section-header">
            <span className="section-icon">💡</span>
            <h1 className="section-title">What is INTENT?</h1>
          </div>

          <div className="doctrine-box">
            <div className="doctrine-label">One Sentence Doctrine</div>
            <p className="doctrine-text">
              "INTENT is the philosophy that human intent, captured as precise engineering notation,
              is the primary driver of scalable and correct system transformation in the age of AI."
            </p>
          </div>

          <div className="acronym-box">
            <h3 className="acronym-title">INTENT stands for:</h3>
            <div className="acronym-breakdown">
              <span className="acronym-letter">
                <span className="letter">I</span>
                <span className="letter-word">Intent-Centered</span>
              </span>
              <span className="acronym-letter">
                <span className="letter">N</span>
                <span className="letter-word">and</span>
              </span>
              <span className="acronym-letter">
                <span className="letter">T</span>
                <span className="letter-word">Engineering-Driven</span>
              </span>
              <span className="acronym-letter">
                <span className="letter">E</span>
                <span className="letter-word">Notation for</span>
              </span>
              <span className="acronym-letter">
                <span className="letter">N</span>
                <span className="letter-word">Transformation</span>
              </span>
              <span className="acronym-letter">
                <span className="letter">T</span>
                <span className="letter-word">(ICE)</span>
              </span>
            </div>
          </div>

          <p className="content-text">
            <strong>INTENT</strong> is an Intent-Centric Engineering Philosophy. It is the belief that
            human intent, captured with engineering rigor, is the primary determinant of system correctness,
            scalability, and speed in the age of AI.
          </p>

          <p className="content-text">
            This is a category-defining approach that cleanly distinguishes itself from prompt hacking,
            low-code/no-code platforms, and "AI replaces engineers" narratives. It asserts discipline and rigor.
          </p>

          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-grey-900)' }}>
            What makes INTENT unique?
          </h3>

          <div className="strengths-grid">
            <div className="strength-card">
              <h4 className="strength-title">Engineering-Driven</h4>
              <p className="strength-text">
                Distinguishes from prompt hacking and low-code approaches. Asserts discipline and rigor.
              </p>
            </div>
            <div className="strength-card">
              <h4 className="strength-title">Notation</h4>
              <p className="strength-text">
                Elevates specs from documentation to executable artifacts.
              </p>
            </div>
            <div className="strength-card">
              <h4 className="strength-title">Transformation</h4>
              <p className="strength-text">
                Broadens scope beyond code to systems, organizations, and platforms.
              </p>
            </div>
            <div className="strength-card">
              <h4 className="strength-title">Memorable</h4>
              <p className="strength-text">
                Philosophical, not procedural. Scales across domains. Enterprise and architecture level.
              </p>
            </div>
          </div>
        </section>

        {/* Principles Section */}
        <section
          id="principles"
          className="content-section"
          ref={(el) => (sectionRefs.current['principles'] = el)}
        >
          <div className="section-header">
            <span className="section-icon">📐</span>
            <h1 className="section-title">The INTENT Principles</h1>
          </div>

          <p className="content-text">
            These seven principles form the foundation of intent-centered engineering.
            Each principle addresses a key aspect of how we build systems in the AI era.
          </p>

          <div className="principles-list">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.number}
                className={`principle-card ${expandedPrinciple === principle.number ? 'expanded' : ''}`}
              >
                <div
                  className="principle-header"
                  onClick={() => setExpandedPrinciple(
                    expandedPrinciple === principle.number ? null : principle.number
                  )}
                >
                  <span className="principle-number">{principle.number}</span>
                  <span className="principle-title">{principle.title}</span>
                  <span className="principle-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
                {expandedPrinciple === principle.number && (
                  <div className="principle-content">
                    <p className="principle-description">{principle.description}</p>
                    <div className="principle-insight">
                      <span className="insight-icon">💡</span>
                      <p className="insight-text">{principle.insight}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Framework Section */}
        <section
          id="framework"
          className="content-section"
          ref={(el) => (sectionRefs.current['framework'] = el)}
        >
          <div className="section-header">
            <span className="section-icon">🔄</span>
            <h1 className="section-title">The INTENT Framework</h1>
          </div>

          <p className="content-text">
            The INTENT Framework is a Specification-First Engineering Framework.
            This is the core operational model that guides all development activities.
          </p>

          <div className="lifecycle-flow">
            <span className="flow-step">Intent</span>
            <span className="flow-arrow">→</span>
            <span className="flow-step">Specification</span>
            <span className="flow-arrow">→</span>
            <span className="flow-step">Derivation</span>
            <span className="flow-arrow">→</span>
            <span className="flow-step">Validation</span>
            <span className="flow-arrow">→</span>
            <span className="flow-step">Evolution</span>
          </div>

          {LIFECYCLE_PHASES.map((phase) => (
            <div
              key={phase.number}
              className={`phase-card ${expandedPhase === phase.number ? 'expanded' : ''}`}
            >
              <div
                className="phase-header"
                onClick={() => setExpandedPhase(
                  expandedPhase === phase.number ? null : phase.number
                )}
              >
                <span className="phase-number">{phase.number}</span>
                <div className="phase-info">
                  <h3 className="phase-title">{phase.title}</h3>
                  <p className="phase-desc">{phase.description}</p>
                </div>
                <span className="phase-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedPhase === phase.number && (
                <div className="phase-content">
                  {phase.examples && (
                    <>
                      <div className="phase-list-title">Examples</div>
                      <div className="phase-list">
                        {phase.examples.map((example, idx) => (
                          <span key={idx} className="phase-tag">{example}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {phase.characteristics && (
                    <>
                      <div className="phase-list-title">Characteristics</div>
                      <div className="phase-list">
                        {phase.characteristics.map((char, idx) => (
                          <span key={idx} className="phase-tag">{char}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {phase.artifacts && (
                    <>
                      <div className="phase-list-title">Artifacts</div>
                      <div className="phase-list">
                        {phase.artifacts.map((artifact, idx) => (
                          <span key={idx} className="phase-tag">{artifact}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {phase.checks && (
                    <>
                      <div className="phase-list-title">Validation Checks</div>
                      <div className="phase-list">
                        {phase.checks.map((check, idx) => (
                          <span key={idx} className="phase-tag">{check}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {phase.enables && (
                    <>
                      <div className="phase-list-title">Enables</div>
                      <div className="phase-list">
                        {phase.enables.map((item, idx) => (
                          <span key={idx} className="phase-tag">{item}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {phase.note && <div className="phase-note">{phase.note}</div>}
                </div>
              )}
            </div>
          ))}

          <table className="comparison-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Traditional Agile / DevOps</th>
                <th>INTENT Framework</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bottleneck</td>
                <td>Coding velocity</td>
                <td>Specification clarity</td>
              </tr>
              <tr>
                <td>Source of truth</td>
                <td>Code</td>
                <td>Intent + specification</td>
              </tr>
              <tr>
                <td>Role of AI</td>
                <td>Assistant</td>
                <td>Derivation engine</td>
              </tr>
              <tr>
                <td>Change model</td>
                <td>Patch and adapt</td>
                <td>Re-specify and derive</td>
              </tr>
              <tr>
                <td>Failure mode</td>
                <td>Technical debt</td>
                <td>Intent drift</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Platform Section */}
        <section
          id="platform"
          className="content-section"
          ref={(el) => (sectionRefs.current['platform'] = el)}
        >
          <div className="section-header">
            <span className="section-icon">🏗️</span>
            <h1 className="section-title">Where IntentR Fits</h1>
          </div>

          <div className="platform-box">
            <p className="platform-tagline">Platform Mapping</p>
            <p className="platform-statement">
              IntentR is not the framework. IntentR implements the framework.
              IntentR is the reference platform for the INTENT Framework.
            </p>

            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-grey-700)', marginBottom: '12px' }}>
              IntentR's Responsibilities:
            </h4>
            <div className="platform-responsibilities">
              <div className="responsibility-item">
                <span className="responsibility-icon">💭</span>
                Capture intent
              </div>
              <div className="responsibility-item">
                <span className="responsibility-icon">📝</span>
                Express notation
              </div>
              <div className="responsibility-item">
                <span className="responsibility-icon">⚙️</span>
                Orchestrate derivation
              </div>
              <div className="responsibility-item">
                <span className="responsibility-icon">✅</span>
                Validate continuously
              </div>
              <div className="responsibility-item">
                <span className="responsibility-icon">🔒</span>
                Preserve intent across change
              </div>
            </div>
          </div>
        </section>

        {/* Manifesto Section */}
        <section
          id="manifesto"
          className="content-section"
          ref={(el) => (sectionRefs.current['manifesto'] = el)}
        >
          <div className="section-header">
            <span className="section-icon">📜</span>
            <h1 className="section-title">The INTENT Manifesto</h1>
          </div>

          <p className="manifesto-intro">
            Software engineering has entered a new era. AI has made execution cheap, fast, and abundant.
            What remains scarce is <strong>human intent</strong>—the clarity of decisions, constraints,
            and purpose that determine whether a system is correct, scalable, and trustworthy.
            <br /><br />
            INTENT exists to address this inversion.
          </p>

          <div className="belief-section">
            <h3 className="belief-title">The Belief</h3>
            <ul className="belief-list">
              <li>Human intent is the highest-value input in software engineering</li>
              <li>Specifications are executable assets, not documentation</li>
              <li>AI should amplify engineering judgment, not replace it</li>
              <li>Systems should be derived from intent, not assembled by hand</li>
              <li>Loss of intent is the root cause of technical and organizational failure</li>
            </ul>
          </div>

          <div className="belief-section">
            <h3 className="belief-title">The Problem</h3>
            <p className="content-text" style={{ margin: 0 }}>
              Modern software practices optimize for speed of iteration, toolchain efficiency, and code production.
              But in an AI-assisted world, these optimizations create a new risk:
              <strong> Systems evolve faster than their meaning.</strong>
            </p>
            <ul className="belief-list" style={{ marginTop: '16px' }}>
              <li>Architectural drift</li>
              <li>Fragile systems</li>
              <li>Unreviewable AI-generated output</li>
              <li>Escalating complexity disguised as velocity</li>
            </ul>
          </div>

          <div className="belief-section">
            <h3 className="belief-title">The Outcome</h3>
            <p className="content-text" style={{ marginBottom: '16px' }}>
              INTENT enables organizations to:
            </p>
            <ul className="belief-list">
              <li>Build systems that scale without losing meaning</li>
              <li>Use AI aggressively without surrendering control</li>
              <li>Evolve architecture safely over time</li>
              <li>Replace accidental complexity with deliberate design</li>
            </ul>
            <p className="content-text" style={{ marginTop: '16px', fontWeight: '500' }}>
              INTENT does not replace engineering discipline—it restores it.
            </p>
          </div>

          <div className="call-to-action">
            <h3 className="cta-title">The Call</h3>
            <ul className="cta-conditions">
              <li>Speed without clarity is fragility</li>
              <li>AI without constraints is risk</li>
              <li>Engineering is about decisions, not typing</li>
            </ul>
            <p className="cta-statement">Then INTENT is for you.</p>
            <p style={{ marginTop: '24px', fontSize: '15px', opacity: 0.85, lineHeight: 1.6 }}>
              INTENT is not a tool. It is not a process. It is a philosophy for building systems
              that mean what we intend them to mean—at any scale, with any technology, in any era.
            </p>
            <div className="cta-button">
              <Button variant="primary" onClick={() => navigate('/wizard/workspace')}>
                Start Building with INTENT
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LearnINTENT;

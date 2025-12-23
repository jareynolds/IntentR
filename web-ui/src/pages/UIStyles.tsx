import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { AIPresetIndicator } from '../components/AIPresetIndicator';
import { WizardPageNavigation } from '../components/wizard';
import { useWorkspace } from '../context/WorkspaceContext';
import axios from 'axios';
import { SPEC_URL } from '../api/client';

interface ColorConfig {
  name: string;
  hex: string;
  usage: string;
}

interface TypographyConfig {
  name: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  fontFamily: string;
  lineHeight: string;
}

interface SpacingConfig {
  name: string;
  size: string;
}

interface ButtonStylesConfig {
  primary: { bg: string; hover: string; color: string };
  secondary: { bg: string; hover: string; color: string };
  accent: { bg: string; hover: string; color: string };
}

interface BackgroundConfig {
  background: string;
  surface: string;
  elevated: string;
}

interface SidebarConfig {
  background: string;
  foreground: string;
  fontSize: string;
  fontWeight: string;
  activeBackground: string;
  activeForeground: string;
  hoverBackground: string;
  borderColor: string;
}

interface CardConfig {
  background: string;
  foreground: string;
  titleFontSize: string;
  titleFontWeight: string;
  bodyFontSize: string;
  bodyFontWeight: string;
  borderRadius: string;
  borderColor: string;
  shadow: string;
  hoverShadow: string;
}

export interface UIFrameworkConfig {
  id: string;
  name: string;
  backgroundColors: BackgroundConfig;
  primaryColors: ColorConfig[];
  neutralColors: ColorConfig[];
  semanticColors: ColorConfig[];
  typography: TypographyConfig[];
  spacing: SpacingConfig[];
  buttonStyles: ButtonStylesConfig;
  sidebarStyles?: SidebarConfig;
  cardStyles?: CardConfig;
  isCustom?: boolean;
}

// Function to apply UI style colors to DOM - exported for use in App.tsx
export function applyUIStyleToDOM(framework: UIFrameworkConfig): void {
  const root = document.documentElement;

  // Apply background colors
  root.style.setProperty('--color-background', framework.backgroundColors.background);
  root.style.setProperty('--color-surface', framework.backgroundColors.surface);
  root.style.setProperty('--color-elevated', framework.backgroundColors.elevated);
  root.style.setProperty('--color-systemBackground', framework.backgroundColors.background);
  root.style.setProperty('--color-grey-50', framework.backgroundColors.background);
  root.style.setProperty('--color-grey-100', framework.backgroundColors.surface);

  // Apply primary colors if available
  if (framework.primaryColors.length > 0) {
    root.style.setProperty('--color-primary', framework.primaryColors[0].hex);
    if (framework.primaryColors.length > 1) {
      root.style.setProperty('--color-primary-hover', framework.primaryColors[1].hex);
    }
  }

  // Apply text colors based on background darkness
  const isDark = framework.backgroundColors.background === '#000000' ||
                 framework.backgroundColors.background === '#1a1a1a' ||
                 framework.backgroundColors.background === '#2d2d2d' ||
                 framework.backgroundColors.background === '#111111' ||
                 framework.backgroundColors.background === '#081534' ||
                 framework.backgroundColors.background === '#1a1528';

  if (isDark) {
    root.style.setProperty('--color-text-primary', '#FFFFFF');
    root.style.setProperty('--color-text-secondary', '#E5E5E5');
    root.style.setProperty('--color-text-tertiary', '#9CA3AF');
    root.style.setProperty('--color-grey-900', '#FFFFFF');
    root.style.setProperty('--color-grey-800', '#E5E5E5');
    root.style.setProperty('--color-grey-600', '#9CA3AF');
  } else {
    root.style.setProperty('--color-text-primary', '#1a1528');
    root.style.setProperty('--color-text-secondary', '#4b5563');
    root.style.setProperty('--color-text-tertiary', '#9ca3af');
    root.style.setProperty('--color-grey-900', '#1a1528');
    root.style.setProperty('--color-grey-800', '#2d2640');
    root.style.setProperty('--color-grey-600', '#5c4f7a');
  }

  // Apply border colors
  root.style.setProperty('--color-border', isDark ? '#374151' : '#e5e7eb');
  root.style.setProperty('--color-grey-200', isDark ? '#374151' : '#e5e7eb');
  root.style.setProperty('--color-grey-300', isDark ? '#4b5563' : '#d1d5db');

  // Apply semantic colors
  framework.semanticColors.forEach(color => {
    const name = color.name.toLowerCase();
    root.style.setProperty(`--color-${name}`, color.hex);
  });

  // Apply button primary color
  if (framework.buttonStyles) {
    root.style.setProperty('--color-blue-500', framework.buttonStyles.primary.bg);
    root.style.setProperty('--color-blue-600', framework.buttonStyles.primary.hover);
  }

  // Apply sidebar styles
  if (framework.sidebarStyles) {
    root.style.setProperty('--sidebar-background', framework.sidebarStyles.background);
    root.style.setProperty('--sidebar-font-size', framework.sidebarStyles.fontSize);
    root.style.setProperty('--sidebar-font-weight', framework.sidebarStyles.fontWeight);
    root.style.setProperty('--sidebar-active-background', framework.sidebarStyles.activeBackground);
    root.style.setProperty('--sidebar-active-foreground', framework.sidebarStyles.activeForeground);
    root.style.setProperty('--sidebar-hover-background', framework.sidebarStyles.hoverBackground);
    root.style.setProperty('--sidebar-border-color', framework.sidebarStyles.borderColor);

    // Determine if sidebar background is dark and set text color accordingly
    const sidebarBg = framework.sidebarStyles.background.toLowerCase();
    const isSidebarDark = sidebarBg === '#000000' || sidebarBg === '#1a1a1a' || sidebarBg === '#2d2d2d' ||
                          sidebarBg === '#111111' || sidebarBg === '#1a1528' || sidebarBg === '#2d2640' ||
                          sidebarBg === '#081534' || sidebarBg === '#453a5c' || sidebarBg === '#374151' ||
                          sidebarBg === '#3f51b5' || sidebarBg === '#303f9f';

    // For dark sidebar backgrounds, always use white text
    if (isSidebarDark) {
      root.style.setProperty('--sidebar-foreground', '#FFFFFF');
    } else {
      root.style.setProperty('--sidebar-foreground', framework.sidebarStyles.foreground);
    }
  }

  // Apply card styles
  if (framework.cardStyles) {
    root.style.setProperty('--card-background', framework.cardStyles.background);
    root.style.setProperty('--card-title-font-size', framework.cardStyles.titleFontSize);
    root.style.setProperty('--card-title-font-weight', framework.cardStyles.titleFontWeight);
    root.style.setProperty('--card-body-font-size', framework.cardStyles.bodyFontSize);
    root.style.setProperty('--card-body-font-weight', framework.cardStyles.bodyFontWeight);
    root.style.setProperty('--card-border-radius', framework.cardStyles.borderRadius);
    root.style.setProperty('--card-border-color', framework.cardStyles.borderColor);
    root.style.setProperty('--card-shadow', framework.cardStyles.shadow);
    root.style.setProperty('--card-hover-shadow', framework.cardStyles.hoverShadow);

    // Determine if card background is dark and set text color accordingly
    const cardBg = framework.cardStyles.background.toLowerCase();
    const isCardDark = cardBg === '#000000' || cardBg === '#1a1a1a' || cardBg === '#2d2d2d' ||
                       cardBg === '#111111' || cardBg === '#1a1528' || cardBg === '#2d2640' ||
                       cardBg === '#081534' || cardBg === '#453a5c' || cardBg === '#374151';

    // For dark card backgrounds, always use white text
    if (isCardDark) {
      root.style.setProperty('--card-foreground', '#FFFFFF');
      root.style.setProperty('--card-title-color', '#FFFFFF');
      root.style.setProperty('--card-body-color', '#FFFFFF');
    } else {
      root.style.setProperty('--card-foreground', framework.cardStyles.foreground);
      root.style.setProperty('--card-title-color', framework.cardStyles.foreground);
      root.style.setProperty('--card-body-color', framework.cardStyles.foreground);
    }
  }
}

// Predefined UI Frameworks - exported for use in App.tsx
export const defaultUIFrameworks: UIFrameworkConfig[] = [
  {
    id: 'ube',
    name: 'Ube',
    isCustom: false,
    backgroundColors: {
      background: '#faf8fc',
      surface: '#f3f0f7',
      elevated: '#FFFFFF',
    },
    primaryColors: [
      { name: 'Ube Purple', hex: '#8b5cf6', usage: 'Primary brand color, CTAs, buttons' },
      { name: 'Ube Purple Dark', hex: '#7c3aed', usage: 'Primary hover, active states' },
      { name: 'Ube Purple Deep', hex: '#6d28d9', usage: 'Headers, key elements' },
      { name: 'Ube Purple Light', hex: '#a78bfa', usage: 'Accents, highlights, interactive elements' },
    ],
    neutralColors: [
      { name: 'White', hex: '#FFFFFF', usage: 'Backgrounds, cards, contrast' },
      { name: 'Header Text', hex: '#FFFFFF', usage: 'Header text on dark backgrounds' },
      { name: 'Purple Gray', hex: '#d8d0e5', usage: 'Borders, dividers, disabled states' },
      { name: 'Purple Muted', hex: '#7a6b9e', usage: 'Secondary text' },
      { name: 'Text Primary', hex: '#1a1528', usage: 'Primary body text' },
    ],
    semanticColors: [
      { name: 'Success', hex: '#10b981', usage: 'Success messages, confirmations' },
      { name: 'Warning', hex: '#f59e0b', usage: 'Warnings, alerts' },
      { name: 'Error', hex: '#ef4444', usage: 'Errors, destructive actions' },
      { name: 'Info', hex: '#8b5cf6', usage: 'Information, help text' },
    ],
    typography: [
      { name: 'Display 1', fontSize: '6rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'Display 2', fontSize: '3.75rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'Headline', fontSize: '3rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'Title', fontSize: '2.125rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.3' },
      { name: 'Subheading', fontSize: '1.5rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Body 1', fontSize: '1rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.6' },
      { name: 'Body 2', fontSize: '0.875rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Caption', fontSize: '0.75rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.4' },
    ],
    spacing: [
      { name: 'xs', size: '8px' },
      { name: 'sm', size: '16px' },
      { name: 'md', size: '24px' },
      { name: 'lg', size: '32px' },
      { name: 'xl', size: '48px' },
      { name: '2xl', size: '64px' },
    ],
    buttonStyles: {
      primary: { bg: '#8b5cf6', hover: '#7c3aed', color: '#FFFFFF' },
      secondary: { bg: '#a78bfa', hover: '#8b5cf6', color: '#FFFFFF' },
      accent: { bg: '#c4b5fd', hover: '#a78bfa', color: '#1a1528' },
    },
    sidebarStyles: {
      background: '#f3f0f7',
      foreground: '#1a1528',
      fontSize: '14px',
      fontWeight: '500',
      activeBackground: '#8b5cf6',
      activeForeground: '#FFFFFF',
      hoverBackground: '#e9e4f0',
      borderColor: '#d8d0e5',
    },
    cardStyles: {
      background: '#FFFFFF',
      foreground: '#1a1528',
      titleFontSize: '1.25rem',
      titleFontWeight: '600',
      bodyFontSize: '0.875rem',
      bodyFontWeight: '400',
      borderRadius: '12px',
      borderColor: '#d8d0e5',
      shadow: '0 2px 8px rgba(139, 92, 246, 0.1)',
      hoverShadow: '0 4px 16px rgba(139, 92, 246, 0.15)',
    },
  },
  {
    id: 'ube-dark',
    name: 'Ube Dark',
    isCustom: false,
    backgroundColors: {
      background: '#1a1528',
      surface: '#2d2640',
      elevated: '#453a5c',
    },
    primaryColors: [
      { name: 'Ube Purple', hex: '#a78bfa', usage: 'Primary brand color, CTAs, buttons' },
      { name: 'Ube Purple Bright', hex: '#c4b5fd', usage: 'Primary hover, highlights' },
      { name: 'Ube Purple Deep', hex: '#8b5cf6', usage: 'Active states' },
      { name: 'Ube Purple Light', hex: '#ddd6fe', usage: 'Accents, text highlights' },
    ],
    neutralColors: [
      { name: 'White', hex: '#FFFFFF', usage: 'Primary text, headings' },
      { name: 'Light Gray', hex: '#E5E5E5', usage: 'Body text' },
      { name: 'Medium Gray', hex: '#a89cc4', usage: 'Secondary text, placeholders' },
      { name: 'Dark Border', hex: '#5c4f7a', usage: 'Borders, dividers' },
      { name: 'Surface', hex: '#2d2640', usage: 'Input backgrounds, subtle surfaces' },
    ],
    semanticColors: [
      { name: 'Success', hex: '#34d399', usage: 'Success messages, confirmations' },
      { name: 'Warning', hex: '#fbbf24', usage: 'Warnings, alerts' },
      { name: 'Error', hex: '#f87171', usage: 'Errors, destructive actions' },
      { name: 'Info', hex: '#a78bfa', usage: 'Information, help text' },
    ],
    typography: [
      { name: 'Display 1', fontSize: '6rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'Display 2', fontSize: '3.75rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'Headline', fontSize: '3rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'Title', fontSize: '2.125rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.3' },
      { name: 'Subheading', fontSize: '1.5rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Body 1', fontSize: '1rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.6' },
      { name: 'Body 2', fontSize: '0.875rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Caption', fontSize: '0.75rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.4' },
    ],
    spacing: [
      { name: 'xs', size: '8px' },
      { name: 'sm', size: '16px' },
      { name: 'md', size: '24px' },
      { name: 'lg', size: '32px' },
      { name: 'xl', size: '48px' },
      { name: '2xl', size: '64px' },
    ],
    buttonStyles: {
      primary: { bg: '#8b5cf6', hover: '#a78bfa', color: '#FFFFFF' },
      secondary: { bg: '#5c4f7a', hover: '#7a6b9e', color: '#FFFFFF' },
      accent: { bg: '#c4b5fd', hover: '#ddd6fe', color: '#1a1528' },
    },
    sidebarStyles: {
      background: '#2d2640',
      foreground: '#FFFFFF',
      fontSize: '14px',
      fontWeight: '500',
      activeBackground: '#8b5cf6',
      activeForeground: '#FFFFFF',
      hoverBackground: '#453a5c',
      borderColor: '#5c4f7a',
    },
    cardStyles: {
      background: '#000000',
      foreground: '#FFFFFF',
      titleFontSize: '1.25rem',
      titleFontWeight: '600',
      bodyFontSize: '0.875rem',
      bodyFontWeight: '400',
      borderRadius: '12px',
      borderColor: '#5c4f7a',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      hoverShadow: '0 4px 16px rgba(139, 92, 246, 0.2)',
    },
  },
  {
    id: 'darkblue',
    name: 'Dark Blue',
    isCustom: false,
    backgroundColors: {
      background: '#FFFFFF',
      surface: '#F5F5F5',
      elevated: '#FFFFFF',
    },
    primaryColors: [
      { name: 'Maastricht Blue', hex: '#081534', usage: 'Primary dark, headers, key elements' },
      { name: 'Dark Cerulean', hex: '#133A7C', usage: 'Primary brand color, CTAs, buttons' },
      { name: 'Lapis Lazuli', hex: '#2A6BAC', usage: 'Secondary actions, links' },
      { name: 'Picton Blue', hex: '#47A8E5', usage: 'Accents, highlights, interactive elements' },
    ],
    neutralColors: [
      { name: 'White', hex: '#FFFFFF', usage: 'Backgrounds, cards, contrast' },
      { name: 'Header Text', hex: '#FFFFFF', usage: 'Header text on dark backgrounds' },
      { name: 'Silver Sand', hex: '#C6C6C6', usage: 'Borders, dividers, disabled states' },
      { name: 'Slogan Gray', hex: '#3E5966', usage: 'Secondary text' },
      { name: 'Text Primary', hex: '#212121', usage: 'Primary body text' },
    ],
    semanticColors: [
      { name: 'Success', hex: '#4caf50', usage: 'Success messages, confirmations' },
      { name: 'Warning', hex: '#ff9800', usage: 'Warnings, alerts' },
      { name: 'Error', hex: '#f44336', usage: 'Errors, destructive actions' },
      { name: 'Info', hex: '#47A8E5', usage: 'Information, help text' },
    ],
    typography: [
      { name: 'Display 1', fontSize: '6rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'Display 2', fontSize: '3.75rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'Headline', fontSize: '3rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'Title', fontSize: '2.125rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.3' },
      { name: 'Subheading', fontSize: '1.5rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Body 1', fontSize: '1rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.6' },
      { name: 'Body 2', fontSize: '0.875rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Caption', fontSize: '0.75rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.4' },
    ],
    spacing: [
      { name: 'xs', size: '8px' },
      { name: 'sm', size: '16px' },
      { name: 'md', size: '24px' },
      { name: 'lg', size: '32px' },
      { name: 'xl', size: '48px' },
      { name: '2xl', size: '64px' },
    ],
    buttonStyles: {
      primary: { bg: '#133A7C', hover: '#081534', color: '#FFFFFF' },
      secondary: { bg: '#2A6BAC', hover: '#133A7C', color: '#FFFFFF' },
      accent: { bg: '#47A8E5', hover: '#2A6BAC', color: '#FFFFFF' },
    },
    sidebarStyles: {
      background: '#081534',
      foreground: '#FFFFFF',
      fontSize: '14px',
      fontWeight: '500',
      activeBackground: '#133A7C',
      activeForeground: '#FFFFFF',
      hoverBackground: '#0d2654',
      borderColor: '#133A7C',
    },
    cardStyles: {
      background: '#FFFFFF',
      foreground: '#212121',
      titleFontSize: '1.25rem',
      titleFontWeight: '600',
      bodyFontSize: '0.875rem',
      bodyFontWeight: '400',
      borderRadius: '8px',
      borderColor: '#C6C6C6',
      shadow: '0 2px 8px rgba(8, 21, 52, 0.1)',
      hoverShadow: '0 4px 16px rgba(8, 21, 52, 0.15)',
    },
  },
  {
    id: 'material',
    name: 'Material Design',
    isCustom: false,
    backgroundColors: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
    },
    primaryColors: [
      { name: 'Indigo 500', hex: '#3F51B5', usage: 'Primary brand color' },
      { name: 'Indigo 700', hex: '#303F9F', usage: 'Primary dark' },
      { name: 'Pink A200', hex: '#FF4081', usage: 'Accent color' },
      { name: 'Light Blue 500', hex: '#03A9F4', usage: 'Secondary accent' },
    ],
    neutralColors: [
      { name: 'White', hex: '#FFFFFF', usage: 'Surface' },
      { name: 'Header Text', hex: '#FFFFFF', usage: 'Header text on dark backgrounds' },
      { name: 'Grey 300', hex: '#E0E0E0', usage: 'Dividers' },
      { name: 'Grey 600', hex: '#757575', usage: 'Secondary text' },
      { name: 'Grey 900', hex: '#212121', usage: 'Primary text' },
    ],
    semanticColors: [
      { name: 'Green 500', hex: '#4CAF50', usage: 'Success' },
      { name: 'Orange 500', hex: '#FF9800', usage: 'Warning' },
      { name: 'Red 500', hex: '#F44336', usage: 'Error' },
      { name: 'Blue 500', hex: '#2196F3', usage: 'Info' },
    ],
    typography: [
      { name: 'H1', fontSize: '6rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Roboto, sans-serif', lineHeight: '1.167' },
      { name: 'H2', fontSize: '3.75rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Roboto, sans-serif', lineHeight: '1.2' },
      { name: 'H3', fontSize: '3rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Roboto, sans-serif', lineHeight: '1.167' },
      { name: 'H4', fontSize: '2.125rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Roboto, sans-serif', lineHeight: '1.235' },
      { name: 'H5', fontSize: '1.5rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Roboto, sans-serif', lineHeight: '1.334' },
      { name: 'H6', fontSize: '1.25rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Roboto, sans-serif', lineHeight: '1.6' },
      { name: 'Body 1', fontSize: '1rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Roboto, sans-serif', lineHeight: '1.5' },
      { name: 'Body 2', fontSize: '0.875rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Roboto, sans-serif', lineHeight: '1.43' },
    ],
    spacing: [
      { name: 'xs', size: '8px' },
      { name: 'sm', size: '16px' },
      { name: 'md', size: '24px' },
      { name: 'lg', size: '32px' },
      { name: 'xl', size: '40px' },
      { name: '2xl', size: '48px' },
    ],
    buttonStyles: {
      primary: { bg: '#3F51B5', hover: '#303F9F', color: '#FFFFFF' },
      secondary: { bg: '#E0E0E0', hover: '#BDBDBD', color: '#212121' },
      accent: { bg: '#FF4081', hover: '#F50057', color: '#FFFFFF' },
    },
    sidebarStyles: {
      background: '#3F51B5',
      foreground: '#FFFFFF',
      fontSize: '14px',
      fontWeight: '500',
      activeBackground: '#303F9F',
      activeForeground: '#FFFFFF',
      hoverBackground: 'rgba(255,255,255,0.1)',
      borderColor: '#303F9F',
    },
    cardStyles: {
      background: '#FFFFFF',
      foreground: '#212121',
      titleFontSize: '1.25rem',
      titleFontWeight: '500',
      bodyFontSize: '0.875rem',
      bodyFontWeight: '400',
      borderRadius: '4px',
      borderColor: '#E0E0E0',
      shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      hoverShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
  },
  {
    id: 'bootstrap',
    name: 'Bootstrap 5',
    isCustom: false,
    backgroundColors: {
      background: '#FFFFFF',
      surface: '#F8F9FA',
      elevated: '#FFFFFF',
    },
    primaryColors: [
      { name: 'Primary', hex: '#0d6efd', usage: 'Primary brand color' },
      { name: 'Secondary', hex: '#6c757d', usage: 'Secondary actions' },
      { name: 'Dark', hex: '#212529', usage: 'Dark elements' },
      { name: 'Light', hex: '#f8f9fa', usage: 'Light backgrounds' },
    ],
    neutralColors: [
      { name: 'White', hex: '#ffffff', usage: 'Backgrounds' },
      { name: 'Header Text', hex: '#FFFFFF', usage: 'Header text on dark backgrounds' },
      { name: 'Gray 300', hex: '#dee2e6', usage: 'Borders' },
      { name: 'Gray 600', hex: '#6c757d', usage: 'Muted text' },
      { name: 'Gray 900', hex: '#212529', usage: 'Body text' },
    ],
    semanticColors: [
      { name: 'Success', hex: '#198754', usage: 'Success states' },
      { name: 'Warning', hex: '#ffc107', usage: 'Warnings' },
      { name: 'Danger', hex: '#dc3545', usage: 'Errors' },
      { name: 'Info', hex: '#0dcaf0', usage: 'Information' },
    ],
    typography: [
      { name: 'H1', fontSize: '2.5rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'H2', fontSize: '2rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'H3', fontSize: '1.75rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'H4', fontSize: '1.5rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'H5', fontSize: '1.25rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'H6', fontSize: '1rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'Body', fontSize: '1rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Small', fontSize: '0.875rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
    ],
    spacing: [
      { name: 'xs', size: '8px' },
      { name: 'sm', size: '16px' },
      { name: 'md', size: '24px' },
      { name: 'lg', size: '32px' },
      { name: 'xl', size: '48px' },
      { name: '2xl', size: '64px' },
    ],
    buttonStyles: {
      primary: { bg: '#0d6efd', hover: '#0b5ed7', color: '#FFFFFF' },
      secondary: { bg: '#6c757d', hover: '#5c636a', color: '#FFFFFF' },
      accent: { bg: '#0dcaf0', hover: '#0aa2c0', color: '#000000' },
    },
    sidebarStyles: {
      background: '#212529',
      foreground: '#FFFFFF',
      fontSize: '14px',
      fontWeight: '500',
      activeBackground: '#0d6efd',
      activeForeground: '#FFFFFF',
      hoverBackground: '#343a40',
      borderColor: '#343a40',
    },
    cardStyles: {
      background: '#FFFFFF',
      foreground: '#212529',
      titleFontSize: '1.25rem',
      titleFontWeight: '500',
      bodyFontSize: '1rem',
      bodyFontWeight: '400',
      borderRadius: '0.375rem',
      borderColor: '#dee2e6',
      shadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
      hoverShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
    },
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    isCustom: false,
    backgroundColors: {
      background: '#FFFFFF',
      surface: '#F9FAFB',
      elevated: '#FFFFFF',
    },
    primaryColors: [
      { name: 'Blue 600', hex: '#2563eb', usage: 'Primary' },
      { name: 'Blue 700', hex: '#1d4ed8', usage: 'Primary dark' },
      { name: 'Indigo 600', hex: '#4f46e5', usage: 'Secondary' },
      { name: 'Sky 500', hex: '#0ea5e9', usage: 'Accent' },
    ],
    neutralColors: [
      { name: 'White', hex: '#ffffff', usage: 'Backgrounds' },
      { name: 'Header Text', hex: '#FFFFFF', usage: 'Header text on dark backgrounds' },
      { name: 'Gray 300', hex: '#d1d5db', usage: 'Borders' },
      { name: 'Gray 600', hex: '#4b5563', usage: 'Secondary text' },
      { name: 'Gray 900', hex: '#111827', usage: 'Primary text' },
    ],
    semanticColors: [
      { name: 'Green 500', hex: '#10b981', usage: 'Success' },
      { name: 'Yellow 500', hex: '#f59e0b', usage: 'Warning' },
      { name: 'Red 500', hex: '#ef4444', usage: 'Error' },
      { name: 'Blue 500', hex: '#3b82f6', usage: 'Info' },
    ],
    typography: [
      { name: 'text-6xl', fontSize: '3.75rem', fontWeight: '700', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'text-5xl', fontSize: '3rem', fontWeight: '700', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'text-4xl', fontSize: '2.25rem', fontWeight: '700', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '2.5rem' },
      { name: 'text-3xl', fontSize: '1.875rem', fontWeight: '700', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '2.25rem' },
      { name: 'text-2xl', fontSize: '1.5rem', fontWeight: '700', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '2rem' },
      { name: 'text-xl', fontSize: '1.25rem', fontWeight: '600', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.75rem' },
      { name: 'text-base', fontSize: '1rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5rem' },
      { name: 'text-sm', fontSize: '0.875rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.25rem' },
    ],
    spacing: [
      { name: '2', size: '8px' },
      { name: '4', size: '16px' },
      { name: '6', size: '24px' },
      { name: '8', size: '32px' },
      { name: '12', size: '48px' },
      { name: '16', size: '64px' },
    ],
    buttonStyles: {
      primary: { bg: '#2563eb', hover: '#1d4ed8', color: '#FFFFFF' },
      secondary: { bg: '#6b7280', hover: '#4b5563', color: '#FFFFFF' },
      accent: { bg: '#0ea5e9', hover: '#0284c7', color: '#FFFFFF' },
    },
    sidebarStyles: {
      background: '#111827',
      foreground: '#F9FAFB',
      fontSize: '14px',
      fontWeight: '500',
      activeBackground: '#2563eb',
      activeForeground: '#FFFFFF',
      hoverBackground: '#1f2937',
      borderColor: '#374151',
    },
    cardStyles: {
      background: '#FFFFFF',
      foreground: '#111827',
      titleFontSize: '1.25rem',
      titleFontWeight: '600',
      bodyFontSize: '0.875rem',
      bodyFontWeight: '400',
      borderRadius: '0.5rem',
      borderColor: '#e5e7eb',
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      hoverShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
  },
  {
    id: 'darkmode',
    name: 'Dark Mode',
    isCustom: false,
    backgroundColors: {
      background: '#000000',
      surface: '#1a1a1a',
      elevated: '#2d2d2d',
    },
    primaryColors: [
      { name: 'Pure Black', hex: '#000000', usage: 'Primary background, dark surfaces' },
      { name: 'Dark Gray', hex: '#1a1a1a', usage: 'Cards, elevated surfaces' },
      { name: 'Charcoal', hex: '#2d2d2d', usage: 'Secondary surfaces, modals' },
      { name: 'Electric Blue', hex: '#3b82f6', usage: 'Primary accent, links, CTAs' },
    ],
    neutralColors: [
      { name: 'White', hex: '#FFFFFF', usage: 'Primary text, headings' },
      { name: 'Light Gray', hex: '#E5E5E5', usage: 'Body text' },
      { name: 'Medium Gray', hex: '#9CA3AF', usage: 'Secondary text, placeholders' },
      { name: 'Dark Border', hex: '#374151', usage: 'Borders, dividers' },
      { name: 'Surface', hex: '#111111', usage: 'Input backgrounds, subtle surfaces' },
    ],
    semanticColors: [
      { name: 'Success', hex: '#22c55e', usage: 'Success messages, confirmations' },
      { name: 'Warning', hex: '#f59e0b', usage: 'Warnings, alerts' },
      { name: 'Error', hex: '#ef4444', usage: 'Errors, destructive actions' },
      { name: 'Info', hex: '#3b82f6', usage: 'Information, help text' },
    ],
    typography: [
      { name: 'Display 1', fontSize: '6rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'Display 2', fontSize: '3.75rem', fontWeight: '300', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1' },
      { name: 'Headline', fontSize: '3rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.2' },
      { name: 'Title', fontSize: '2.125rem', fontWeight: '500', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.3' },
      { name: 'Subheading', fontSize: '1.5rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Body 1', fontSize: '1rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.6' },
      { name: 'Body 2', fontSize: '0.875rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.5' },
      { name: 'Caption', fontSize: '0.75rem', fontWeight: '400', fontStyle: 'normal', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.4' },
    ],
    spacing: [
      { name: 'xs', size: '8px' },
      { name: 'sm', size: '16px' },
      { name: 'md', size: '24px' },
      { name: 'lg', size: '32px' },
      { name: 'xl', size: '48px' },
      { name: '2xl', size: '64px' },
    ],
    buttonStyles: {
      primary: { bg: '#3b82f6', hover: '#2563eb', color: '#FFFFFF' },
      secondary: { bg: '#374151', hover: '#4b5563', color: '#FFFFFF' },
      accent: { bg: '#8b5cf6', hover: '#7c3aed', color: '#FFFFFF' },
    },
    sidebarStyles: {
      background: '#1a1a1a',
      foreground: '#FFFFFF',
      fontSize: '14px',
      fontWeight: '500',
      activeBackground: '#3b82f6',
      activeForeground: '#FFFFFF',
      hoverBackground: '#2d2d2d',
      borderColor: '#374151',
    },
    cardStyles: {
      background: '#000000',
      foreground: '#FFFFFF',
      titleFontSize: '1.25rem',
      titleFontWeight: '600',
      bodyFontSize: '0.875rem',
      bodyFontWeight: '400',
      borderRadius: '8px',
      borderColor: '#374151',
      shadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
      hoverShadow: '0 4px 16px rgba(59, 130, 246, 0.2)',
    },
  },
];

// Tab types for navigation
type MainTab = 'foundations' | 'surfaces' | 'components' | 'layout' | 'states';

interface TabConfig {
  id: MainTab;
  label: string;
  icon: string;
  subTabs: { id: string; label: string }[];
}

const tabConfigs: TabConfig[] = [
  {
    id: 'foundations',
    label: 'Foundations',
    icon: '🎨',
    subTabs: [
      { id: 'colors', label: 'Colors' },
      { id: 'typography', label: 'Typography' },
      { id: 'spacing', label: 'Spacing' },
    ]
  },
  {
    id: 'surfaces',
    label: 'Surfaces',
    icon: '📐',
    subTabs: [
      { id: 'backgrounds', label: 'Backgrounds' },
    ]
  },
  {
    id: 'components',
    label: 'Components',
    icon: '🧩',
    subTabs: [
      { id: 'buttons', label: 'Buttons' },
      { id: 'cards', label: 'Cards' },
    ]
  },
  {
    id: 'layout',
    label: 'Layout',
    icon: '📱',
    subTabs: [
      { id: 'sidebar', label: 'Sidebar' },
    ]
  },
  {
    id: 'states',
    label: 'States',
    icon: '🔔',
    subTabs: [
      { id: 'semantic', label: 'Semantic Colors' },
    ]
  },
];

export const UIStyles: React.FC = () => {
  const { currentWorkspace, updateWorkspace } = useWorkspace();

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<MainTab>('foundations');
  const [activeSubTab, setActiveSubTab] = useState<string>('colors');

  // Available frameworks (default + custom)
  const [frameworks, setFrameworks] = useState<UIFrameworkConfig[]>(defaultUIFrameworks);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('bootstrap');
  const [activatedFrameworkId, setActivatedFrameworkId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFrameworkName, setNewFrameworkName] = useState('');
  const [showActivationSuccess, setShowActivationSuccess] = useState(false);

  // Update sub-tab when main tab changes
  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    const tabConfig = tabConfigs.find(t => t.id === tab);
    if (tabConfig && tabConfig.subTabs.length > 0) {
      setActiveSubTab(tabConfig.subTabs[0].id);
    }
  };

  // Current editing state
  const [backgroundColors, setBackgroundColors] = useState<BackgroundConfig>({
    background: '#FFFFFF',
    surface: '#F5F5F5',
    elevated: '#FFFFFF',
  });
  const [primaryColors, setPrimaryColors] = useState<ColorConfig[]>([]);
  const [neutralColors, setNeutralColors] = useState<ColorConfig[]>([]);
  const [semanticColors, setSemanticColors] = useState<ColorConfig[]>([]);
  const [typography, setTypography] = useState<TypographyConfig[]>([]);
  const [spacing, setSpacing] = useState<SpacingConfig[]>([]);
  const [buttonStyles, setButtonStyles] = useState<ButtonStylesConfig>({
    primary: { bg: '#133A7C', hover: '#081534', color: '#FFFFFF' },
    secondary: { bg: '#2A6BAC', hover: '#133A7C', color: '#FFFFFF' },
    accent: { bg: '#47A8E5', hover: '#2A6BAC', color: '#FFFFFF' },
  });

  const [sidebarStyles, setSidebarStyles] = useState<SidebarConfig>({
    background: '#081534',
    foreground: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '500',
    activeBackground: '#133A7C',
    activeForeground: '#FFFFFF',
    hoverBackground: '#0d2654',
    borderColor: '#133A7C',
  });

  const [cardStyles, setCardStyles] = useState<CardConfig>({
    background: '#FFFFFF',
    foreground: '#212121',
    titleFontSize: '1.25rem',
    titleFontWeight: '600',
    bodyFontSize: '0.875rem',
    bodyFontWeight: '400',
    borderRadius: '8px',
    borderColor: '#C6C6C6',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    hoverShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
  });

  // Load custom frameworks and selected framework from workspace
  useEffect(() => {
    const allFrameworks = currentWorkspace?.customUIFrameworks
      ? [...defaultUIFrameworks, ...currentWorkspace.customUIFrameworks]
      : defaultUIFrameworks;

    if (currentWorkspace?.customUIFrameworks) {
      setFrameworks(allFrameworks);
    }
    // Load the saved framework selection and activated framework
    if (currentWorkspace?.selectedUIFramework) {
      setSelectedFrameworkId(currentWorkspace.selectedUIFramework);
      // Set as activated if it exists
      setActivatedFrameworkId(currentWorkspace.selectedUIFramework);

      // Apply the saved UI style to the DOM on load
      const savedFramework = allFrameworks.find(f => f.id === currentWorkspace.selectedUIFramework);
      if (savedFramework) {
        applyUIStyleToDOM(savedFramework);
      }
    }
  }, [currentWorkspace]);

  // Load selected framework data
  useEffect(() => {
    const framework = frameworks.find(f => f.id === selectedFrameworkId);
    if (framework) {
      setBackgroundColors({ ...framework.backgroundColors });
      setPrimaryColors([...framework.primaryColors]);
      setNeutralColors([...framework.neutralColors]);
      setSemanticColors([...framework.semanticColors]);
      // Ensure typography entries have fontStyle and fontFamily defaults
      const typographyWithDefaults = framework.typography.map(t => ({
        ...t,
        fontStyle: t.fontStyle || 'normal',
        fontFamily: t.fontFamily || 'Inter, system-ui, sans-serif',
      }));
      setTypography(typographyWithDefaults);
      setSpacing([...framework.spacing]);
      setButtonStyles({ ...framework.buttonStyles });
      if (framework.sidebarStyles) {
        setSidebarStyles({ ...framework.sidebarStyles });
      }
      if (framework.cardStyles) {
        setCardStyles({ ...framework.cardStyles });
      }
      setHasChanges(false);
    }
  }, [selectedFrameworkId, frameworks]);

  const colorOptions = [
    '#081534', '#133A7C', '#2A6BAC', '#47A8E5', '#FFFFFF', '#C6C6C6',
    '#3E5966', '#212121', '#4caf50', '#ff9800', '#f44336', '#E8F4FB',
    '#F5FAFD', '#E8F5E9', '#FFF3E0', '#FFEBEE', '#0d6efd', '#6c757d',
    '#2563eb', '#4f46e5', '#3F51B5', '#FF4081',
    // Dark Mode colors
    '#000000', '#1a1a1a', '#2d2d2d', '#374151', '#111111', '#E5E5E5',
    '#9CA3AF', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#7c3aed',
    '#4b5563'
  ];

  const fontWeightOptions = ['300', '400', '500', '600', '700'];
  const fontStyleOptions = ['normal', 'italic', 'oblique'];
  const fontFamilyOptions = [
    'Inter, system-ui, sans-serif',
    'Roboto, sans-serif',
    'Open Sans, sans-serif',
    'Lato, sans-serif',
    'Poppins, sans-serif',
    'Montserrat, sans-serif',
    'Source Sans Pro, sans-serif',
    'Nunito, sans-serif',
    'Raleway, sans-serif',
    'Work Sans, sans-serif',
    'Georgia, serif',
    'Times New Roman, serif',
    'Merriweather, serif',
    'Playfair Display, serif',
    'Fira Code, monospace',
    'JetBrains Mono, monospace',
    'SF Mono, monospace',
    'Consolas, monospace',
  ];
  const fontSizeOptions = ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '1.75rem', '2rem', '2.125rem', '2.5rem', '3rem', '3.75rem', '4rem', '5rem', '6rem'];
  const lineHeightOptions = ['1', '1.2', '1.3', '1.4', '1.5', '1.6'];
  const spacingOptions = ['4px', '8px', '12px', '16px', '20px', '24px', '32px', '40px', '48px', '56px', '64px', '80px', '96px'];
  const borderRadiusOptions = ['0px', '2px', '4px', '6px', '8px', '10px', '12px', '16px', '20px', '24px'];
  const shadowOptions = [
    'none',
    '0 1px 2px rgba(0, 0, 0, 0.05)',
    '0 2px 4px rgba(0, 0, 0, 0.1)',
    '0 2px 8px rgba(0, 0, 0, 0.1)',
    '0 4px 12px rgba(0, 0, 0, 0.15)',
    '0 4px 16px rgba(0, 0, 0, 0.15)',
    '0 8px 24px rgba(0, 0, 0, 0.2)',
    '0 12px 32px rgba(0, 0, 0, 0.25)',
  ];

  const updateBackgroundColor = (field: 'background' | 'surface' | 'elevated', value: string) => {
    setBackgroundColors(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updatePrimaryColor = (index: number, field: 'name' | 'hex' | 'usage', value: string) => {
    const updated = [...primaryColors];
    updated[index] = { ...updated[index], [field]: value };
    setPrimaryColors(updated);
    setHasChanges(true);
  };

  const updateNeutralColor = (index: number, field: 'name' | 'hex' | 'usage', value: string) => {
    const updated = [...neutralColors];
    updated[index] = { ...updated[index], [field]: value };
    setNeutralColors(updated);
    setHasChanges(true);
  };

  const updateSemanticColor = (index: number, field: 'name' | 'hex' | 'usage', value: string) => {
    const updated = [...semanticColors];
    updated[index] = { ...updated[index], [field]: value };
    setSemanticColors(updated);
    setHasChanges(true);
  };

  const updateTypography = (index: number, field: 'fontSize' | 'fontWeight' | 'fontStyle' | 'fontFamily' | 'lineHeight', value: string) => {
    const updated = [...typography];
    updated[index] = { ...updated[index], [field]: value };
    setTypography(updated);
    setHasChanges(true);
  };

  const updateSpacing = (index: number, value: string) => {
    const updated = [...spacing];
    updated[index] = { ...updated[index], size: value };
    setSpacing(updated);
    setHasChanges(true);
  };

  const updateButtonStyle = (type: 'primary' | 'secondary' | 'accent', field: 'bg' | 'hover' | 'color', value: string) => {
    setButtonStyles(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
    setHasChanges(true);
  };

  const updateSidebarStyle = (field: keyof SidebarConfig, value: string) => {
    setSidebarStyles(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateCardStyle = (field: keyof CardConfig, value: string) => {
    setCardStyles(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSaveAsNew = async () => {
    if (!currentWorkspace || !newFrameworkName.trim()) {
      alert('Please enter a framework name');
      return;
    }

    const newFramework: UIFrameworkConfig = {
      id: `custom-${Date.now()}`,
      name: newFrameworkName,
      isCustom: true,
      backgroundColors: { ...backgroundColors },
      primaryColors: [...primaryColors],
      neutralColors: [...neutralColors],
      semanticColors: [...semanticColors],
      typography: [...typography],
      spacing: [...spacing],
      buttonStyles: { ...buttonStyles },
      sidebarStyles: { ...sidebarStyles },
      cardStyles: { ...cardStyles },
    };

    const customFrameworks = currentWorkspace.customUIFrameworks || [];
    const updatedCustomFrameworks = [...customFrameworks, newFramework];

    try {
      // Save the new framework to workspace
      await updateWorkspace(currentWorkspace.id, {
        customUIFrameworks: updatedCustomFrameworks,
        selectedUIFramework: newFramework.id,
      });

      // Update local state
      setFrameworks([...defaultUIFrameworks, ...updatedCustomFrameworks]);
      setSelectedFrameworkId(newFramework.id);
      setShowSaveModal(false);
      setNewFrameworkName('');
      setHasChanges(false);

      // Apply the UI style to DOM and activate it
      applyUIStyleToDOM(newFramework);
      setActivatedFrameworkId(newFramework.id);

      // Save specification file
      await saveUIStyleSpecification(newFramework);

      // Show success message
      setShowActivationSuccess(true);
      setTimeout(() => setShowActivationSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save and activate UI style:', error);
      alert('Failed to save UI style. Please try again.');
    }
  };

  const handleUpdateExisting = async () => {
    if (!currentWorkspace) return;

    const framework = frameworks.find(f => f.id === selectedFrameworkId);
    if (!framework || !framework.isCustom) {
      alert('Can only update custom frameworks');
      return;
    }

    const updatedFramework: UIFrameworkConfig = {
      ...framework,
      backgroundColors: { ...backgroundColors },
      primaryColors: [...primaryColors],
      neutralColors: [...neutralColors],
      semanticColors: [...semanticColors],
      typography: [...typography],
      spacing: [...spacing],
      buttonStyles: { ...buttonStyles },
      sidebarStyles: { ...sidebarStyles },
      cardStyles: { ...cardStyles },
    };

    const customFrameworks = currentWorkspace.customUIFrameworks || [];
    const updatedCustomFrameworks = customFrameworks.map(f =>
      f.id === selectedFrameworkId ? updatedFramework : f
    );

    try {
      await updateWorkspace(currentWorkspace.id, {
        customUIFrameworks: updatedCustomFrameworks,
      });

      setFrameworks([...defaultUIFrameworks, ...updatedCustomFrameworks]);
      setHasChanges(false);

      // If this framework is currently activated, apply the updates to DOM
      if (activatedFrameworkId === selectedFrameworkId) {
        applyUIStyleToDOM(updatedFramework);
        await saveUIStyleSpecification(updatedFramework);
      }

      // Show success message
      setShowActivationSuccess(true);
      setTimeout(() => setShowActivationSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update UI style:', error);
      alert('Failed to update UI style. Please try again.');
    }
  };

  const handleDeleteCustom = async () => {
    if (!currentWorkspace) return;

    const framework = frameworks.find(f => f.id === selectedFrameworkId);
    if (!framework || !framework.isCustom) {
      alert('Can only delete custom frameworks');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${framework.name}"?`)) {
      return;
    }

    const customFrameworks = currentWorkspace.customUIFrameworks || [];
    const updatedCustomFrameworks = customFrameworks.filter(f => f.id !== selectedFrameworkId);

    await updateWorkspace(currentWorkspace.id, {
      customUIFrameworks: updatedCustomFrameworks,
    });

    setFrameworks([...defaultUIFrameworks, ...updatedCustomFrameworks]);
    setSelectedFrameworkId('darkblue');
  };

  // Generate specification markdown for UI styles
  const generateUIStyleSpecification = (framework: UIFrameworkConfig): string => {
    const timestamp = new Date().toISOString();

    return `# UI Style Specification: ${framework.name}

**Generated:** ${timestamp}
**Style ID:** ${framework.id}
${framework.isCustom ? '**Type:** Custom Style\n' : ''}

## Overview

This document provides comprehensive specifications for implementing the ${framework.name} UI style system in your application. It includes detailed color palettes, typography scales, spacing systems, and component styles that form the visual foundation of your user interface.

## Background Colors

The background colors define the foundational surfaces of your application.

**Main Background**
- **Hex:** \`${framework.backgroundColors.background}\`
- **Usage:** Page background, body background
- **CSS Variable:** \`--color-background\`

\`\`\`css
body {
  background-color: ${framework.backgroundColors.background};
  /* or */
  background-color: var(--color-background);
}
\`\`\`

**Surface**
- **Hex:** \`${framework.backgroundColors.surface}\`
- **Usage:** Cards, panels, content areas
- **CSS Variable:** \`--color-surface\`

\`\`\`css
.card {
  background-color: ${framework.backgroundColors.surface};
  /* or */
  background-color: var(--color-surface);
}
\`\`\`

**Elevated**
- **Hex:** \`${framework.backgroundColors.elevated}\`
- **Usage:** Modals, dropdowns, popovers
- **CSS Variable:** \`--color-elevated\`

\`\`\`css
.modal {
  background-color: ${framework.backgroundColors.elevated};
  /* or */
  background-color: var(--color-elevated);
}
\`\`\`

## Color Palette

### Primary Colors

${framework.primaryColors.map(color => `
**${color.name}**
- **Hex:** \`${color.hex}\`
- **Usage:** ${color.usage}
- **CSS Variable:** \`--color-primary-${color.name.toLowerCase().replace(/\s+/g, '-')}\`

\`\`\`css
.element {
  background-color: ${color.hex};
  /* or */
  background-color: var(--color-primary-${color.name.toLowerCase().replace(/\s+/g, '-')});
}
\`\`\`
`).join('\n')}

### Neutral Colors

${framework.neutralColors.map(color => `
**${color.name}**
- **Hex:** \`${color.hex}\`
- **Usage:** ${color.usage}
- **CSS Variable:** \`--color-neutral-${color.name.toLowerCase().replace(/\s+/g, '-')}\`

\`\`\`css
.element {
  color: ${color.hex};
  /* or */
  color: var(--color-neutral-${color.name.toLowerCase().replace(/\s+/g, '-')});
}
\`\`\`
`).join('\n')}

### Semantic Colors

${framework.semanticColors.map(color => `
**${color.name}**
- **Hex:** \`${color.hex}\`
- **Usage:** ${color.usage}
- **CSS Variable:** \`--color-${color.name.toLowerCase()}\`

\`\`\`css
.alert-${color.name.toLowerCase()} {
  background-color: ${color.hex};
  border-color: ${color.hex};
}
\`\`\`
`).join('\n')}

## Typography System

### Typography Scale

${framework.typography.map(typo => `
**${typo.name}**
- **Font Family:** ${typo.fontFamily || 'Inter, system-ui, sans-serif'}
- **Font Size:** ${typo.fontSize}
- **Font Weight:** ${typo.fontWeight}
- **Font Style:** ${typo.fontStyle || 'normal'}
- **Line Height:** ${typo.lineHeight}
- **CSS Class:** \`.text-${typo.name.toLowerCase().replace(/\s+/g, '-')}\`

\`\`\`css
.text-${typo.name.toLowerCase().replace(/\s+/g, '-')} {
  font-family: ${typo.fontFamily || 'Inter, system-ui, sans-serif'};
  font-size: ${typo.fontSize};
  font-weight: ${typo.fontWeight};
  font-style: ${typo.fontStyle || 'normal'};
  line-height: ${typo.lineHeight};
}
\`\`\`

**HTML Usage:**
\`\`\`html
<h1 class="text-${typo.name.toLowerCase().replace(/\s+/g, '-')}">Heading Text</h1>
\`\`\`
`).join('\n')}

### Font Stack Recommendation

Use a modern, cross-platform font stack for optimal readability:

\`\`\`css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
               'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
               sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
\`\`\`

## Spacing System

### Spacing Scale

${framework.spacing.map(space => `
**${space.name}**
- **Size:** ${space.size}
- **CSS Variable:** \`--spacing-${space.name}\`
- **Usage:** Margins, padding, gaps

\`\`\`css
.element {
  margin: ${space.size};
  padding: ${space.size};
  gap: ${space.size};
  /* or */
  margin: var(--spacing-${space.name});
}
\`\`\`
`).join('\n')}

### Spacing Usage Guidelines

- **xs (${framework.spacing.find(s => s.name === 'xs')?.size}):** Tight spacing, inline elements, compact layouts
- **sm (${framework.spacing.find(s => s.name === 'sm')?.size}):** Default spacing between related elements
- **md (${framework.spacing.find(s => s.name === 'md')?.size}):** Section spacing, card padding
- **lg (${framework.spacing.find(s => s.name === 'lg')?.size}):** Large section gaps, major layout divisions
- **xl (${framework.spacing.find(s => s.name === 'xl')?.size}):** Hero sections, major page divisions
- **2xl (${framework.spacing.find(s => s.name === '2xl')?.size}):** Maximum spacing for dramatic separation

## Button Styles

### Primary Button

**Colors:**
- Background: \`${framework.buttonStyles.primary.bg}\`
- Hover: \`${framework.buttonStyles.primary.hover}\`
- Text: \`${framework.buttonStyles.primary.color}\`

**Implementation:**

\`\`\`css
.btn-primary {
  background-color: ${framework.buttonStyles.primary.bg};
  color: ${framework.buttonStyles.primary.color};
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-primary:hover {
  background-color: ${framework.buttonStyles.primary.hover};
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}
\`\`\`

\`\`\`html
<button class="btn-primary">Primary Action</button>
\`\`\`

### Secondary Button

**Colors:**
- Background: \`${framework.buttonStyles.secondary.bg}\`
- Hover: \`${framework.buttonStyles.secondary.hover}\`
- Text: \`${framework.buttonStyles.secondary.color}\`

**Implementation:**

\`\`\`css
.btn-secondary {
  background-color: ${framework.buttonStyles.secondary.bg};
  color: ${framework.buttonStyles.secondary.color};
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-secondary:hover {
  background-color: ${framework.buttonStyles.secondary.hover};
}
\`\`\`

\`\`\`html
<button class="btn-secondary">Secondary Action</button>
\`\`\`

### Accent Button

**Colors:**
- Background: \`${framework.buttonStyles.accent.bg}\`
- Hover: \`${framework.buttonStyles.accent.hover}\`
- Text: \`${framework.buttonStyles.accent.color}\`

**Implementation:**

\`\`\`css
.btn-accent {
  background-color: ${framework.buttonStyles.accent.bg};
  color: ${framework.buttonStyles.accent.color};
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-accent:hover {
  background-color: ${framework.buttonStyles.accent.hover};
}
\`\`\`

\`\`\`html
<button class="btn-accent">Accent Action</button>
\`\`\`

## CSS Variables Implementation

For easier maintenance and theming, implement CSS variables:

\`\`\`css
:root {
  /* Background Colors */
  --color-background: ${framework.backgroundColors.background};
  --color-surface: ${framework.backgroundColors.surface};
  --color-elevated: ${framework.backgroundColors.elevated};

  /* Primary Colors */
${framework.primaryColors.map(color => `  --color-primary-${color.name.toLowerCase().replace(/\s+/g, '-')}: ${color.hex};`).join('\n')}

  /* Neutral Colors */
${framework.neutralColors.map(color => `  --color-neutral-${color.name.toLowerCase().replace(/\s+/g, '-')}: ${color.hex};`).join('\n')}

  /* Semantic Colors */
${framework.semanticColors.map(color => `  --color-${color.name.toLowerCase()}: ${color.hex};`).join('\n')}

  /* Spacing */
${framework.spacing.map(space => `  --spacing-${space.name}: ${space.size};`).join('\n')}

  /* Typography */
${framework.typography.map(typo => `  --font-family-${typo.name.toLowerCase().replace(/\s+/g, '-')}: ${typo.fontFamily || 'Inter, system-ui, sans-serif'};
  --font-size-${typo.name.toLowerCase().replace(/\s+/g, '-')}: ${typo.fontSize};
  --font-weight-${typo.name.toLowerCase().replace(/\s+/g, '-')}: ${typo.fontWeight};
  --font-style-${typo.name.toLowerCase().replace(/\s+/g, '-')}: ${typo.fontStyle || 'normal'};
  --line-height-${typo.name.toLowerCase().replace(/\s+/g, '-')}: ${typo.lineHeight};`).join('\n')}

  /* Button Styles */
  --btn-primary-bg: ${framework.buttonStyles.primary.bg};
  --btn-primary-hover: ${framework.buttonStyles.primary.hover};
  --btn-primary-color: ${framework.buttonStyles.primary.color};

  --btn-secondary-bg: ${framework.buttonStyles.secondary.bg};
  --btn-secondary-hover: ${framework.buttonStyles.secondary.hover};
  --btn-secondary-color: ${framework.buttonStyles.secondary.color};

  --btn-accent-bg: ${framework.buttonStyles.accent.bg};
  --btn-accent-hover: ${framework.buttonStyles.accent.hover};
  --btn-accent-color: ${framework.buttonStyles.accent.color};
}
\`\`\`

## Component Examples

### Card Component

\`\`\`css
.card {
  background-color: var(--color-neutral-white);
  border: 1px solid var(--color-neutral-gray-300);
  border-radius: 8px;
  padding: var(--spacing-md);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-title {
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-title);
  color: var(--color-primary-maastricht-blue);
  margin-bottom: var(--spacing-sm);
}

.card-content {
  font-size: var(--font-size-body-1);
  line-height: var(--line-height-body-1);
  color: var(--color-neutral-text-primary);
}
\`\`\`

### Form Input

\`\`\`css
.form-input {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--font-size-body-1);
  border: 1px solid var(--color-neutral-gray-300);
  border-radius: 6px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary-dark-cerulean);
  box-shadow: 0 0 0 3px rgba(19, 58, 124, 0.1);
}

.form-input:disabled {
  background-color: var(--color-neutral-gray-100);
  cursor: not-allowed;
}

.form-input.error {
  border-color: var(--color-error);
}
\`\`\`

### Alert Component

\`\`\`css
.alert {
  padding: var(--spacing-md);
  border-radius: 6px;
  margin-bottom: var(--spacing-md);
}

.alert-success {
  background-color: color-mix(in srgb, var(--color-success) 15%, white);
  border-left: 4px solid var(--color-success);
  color: var(--color-success);
}

.alert-warning {
  background-color: color-mix(in srgb, var(--color-warning) 15%, white);
  border-left: 4px solid var(--color-warning);
  color: var(--color-warning);
}

.alert-error {
  background-color: color-mix(in srgb, var(--color-error) 15%, white);
  border-left: 4px solid var(--color-error);
  color: var(--color-error);
}

.alert-info {
  background-color: color-mix(in srgb, var(--color-info) 15%, white);
  border-left: 4px solid var(--color-info);
  color: var(--color-info);
}
\`\`\`

## Accessibility Considerations

### Color Contrast

Ensure all text meets WCAG 2.1 AA standards (minimum 4.5:1 contrast ratio for normal text):

- Test all color combinations using tools like WebAIM Contrast Checker
- Primary text on white background should use dark colors (${framework.neutralColors.find(c => c.usage.toLowerCase().includes('primary text'))?.hex || '#212121'})
- Light text on dark backgrounds should use white or very light colors

### Focus States

Always provide clear focus indicators:

\`\`\`css
button:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-primary-dark-cerulean);
  outline-offset: 2px;
}
\`\`\`

### Semantic HTML

Use proper HTML5 semantic elements with your styles:

- \`<button>\` for clickable actions
- \`<a>\` for navigation links
- \`<input>\`, \`<select>\`, \`<textarea>\` for form controls
- Proper heading hierarchy (\`<h1>\` → \`<h6>\`)

## Dark Mode Support (Optional)

If implementing dark mode, create an alternative color scheme:

\`\`\`css
@media (prefers-color-scheme: dark) {
  :root {
    /* Invert neutral colors */
    --color-neutral-white: #1a1a1a;
    --color-neutral-text-primary: #ffffff;
    --color-neutral-gray-300: #444444;

    /* Adjust other colors for dark mode */
    /* ... */
  }
}
\`\`\`

## Browser Support

This style system should support:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Integration with UI Framework

This UI Style specification should be used in conjunction with the active UI Framework (layout structure) configured in the UI Framework page. Together they form your complete design system.

## Additional Resources

- **Design Tokens:** Consider using a design token system like Style Dictionary for multi-platform support
- **CSS Preprocessors:** Can be adapted for Sass/LESS with variables or mixins
- **CSS-in-JS:** Can be integrated with styled-components, Emotion, or other CSS-in-JS libraries
- **Tailwind CSS:** Can be configured to match these values in tailwind.config.js

---

**Specification Version:** 1.0
**Last Updated:** ${timestamp}

**Note:** This specification should be reviewed and updated whenever the UI style is modified to ensure consistency across the application.
`;
  };

  // Save specification to file system
  const saveUIStyleSpecification = async (framework: UIFrameworkConfig) => {
    if (!currentWorkspace?.projectFolder) {
      console.warn('No project folder configured for workspace');
      return;
    }

    try {
      const specification = generateUIStyleSpecification(framework);
      const fileName = 'UI-STYLE.md';

      // Call backend API to save the file (port 4001 is the workspace server)
      await axios.post(`${SPEC_URL}/api/save-specification`, {
        fileName: fileName,
        content: specification,
        workspacePath: currentWorkspace.projectFolder,
        subfolder: 'design'
      });

      console.log(`✅ UI Style specification saved: ${fileName}`);
    } catch (error) {
      console.error('Failed to save UI style specification:', error);
      // Don't show alert to user, just log the error
    }
  };

  const handleActivateStyle = async () => {
    const framework = frameworks.find(f => f.id === selectedFrameworkId);
    if (!framework || !currentWorkspace) return;

    try {
      // Apply the UI style colors to the DOM immediately
      applyUIStyleToDOM(framework);

      // Update workspace with selected framework
      await updateWorkspace(currentWorkspace.id, { selectedUIFramework: selectedFrameworkId });

      // Save specification file
      await saveUIStyleSpecification(framework);

      // Set as activated
      setActivatedFrameworkId(selectedFrameworkId);

      // Show success message
      setShowActivationSuccess(true);
      setTimeout(() => setShowActivationSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to activate UI style:', error);
      alert('Failed to activate UI style. Please try again.');
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <h2 className="text-2xl font-semibold mb-4">UI Styles Editor</h2>
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <p>Please select a workspace to configure UI styles.</p>
        </div>
      </div>
    );
  }

  const selectedFramework = frameworks.find(f => f.id === selectedFrameworkId);

  // Get current tab config
  const currentTabConfig = tabConfigs.find(t => t.id === activeTab);

  // Render content based on active tab and sub-tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'foundations':
        return renderFoundationsContent();
      case 'surfaces':
        return renderSurfacesContent();
      case 'components':
        return renderComponentsContent();
      case 'layout':
        return renderLayoutContent();
      case 'states':
        return renderStatesContent();
      default:
        return null;
    }
  };

  // Foundations Tab Content
  const renderFoundationsContent = () => {
    switch (activeSubTab) {
      case 'colors':
        return (
          <>
            {/* Primary Colors */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#133A7C' }}>Primary Colors</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {primaryColors.map((color, index) => (
                  <div key={index} style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: color.hex, borderRadius: '8px', border: '2px solid #ccc' }} />
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={color.name}
                          onChange={(e) => updatePrimaryColor(index, 'name', e.target.value)}
                          style={{ width: '100%', padding: '6px', marginBottom: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                          placeholder="Color name"
                        />
                        <select
                          value={color.hex}
                          onChange={(e) => updatePrimaryColor(index, 'hex', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                          {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={color.usage}
                      onChange={(e) => updatePrimaryColor(index, 'usage', e.target.value)}
                      style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      placeholder="Usage description"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Neutral Colors */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#133A7C' }}>Neutral Colors</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {neutralColors.map((color, index) => (
                  <div key={index} style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: color.hex, borderRadius: '8px', border: '2px solid #ccc' }} />
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={color.name}
                          onChange={(e) => updateNeutralColor(index, 'name', e.target.value)}
                          style={{ width: '100%', padding: '6px', marginBottom: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                          placeholder="Color name"
                        />
                        <select
                          value={color.hex}
                          onChange={(e) => updateNeutralColor(index, 'hex', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                          {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={color.usage}
                      onChange={(e) => updateNeutralColor(index, 'usage', e.target.value)}
                      style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      placeholder="Usage description"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      case 'typography':
        return (
          <div style={{ display: 'grid', gap: '16px' }}>
            {typography.map((typo, index) => (
              <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <strong>{typo.name}</strong>
                  <div style={{ fontSize: typo.fontSize, fontWeight: typo.fontWeight, fontStyle: typo.fontStyle, fontFamily: typo.fontFamily, lineHeight: typo.lineHeight }}>
                    Sample Text
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px' }}>Family</label>
                    <select
                      value={typo.fontFamily}
                      onChange={(e) => updateTypography(index, 'fontFamily', e.target.value)}
                      style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', maxWidth: '180px' }}
                    >
                      {fontFamilyOptions.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px' }}>Size</label>
                    <select
                      value={typo.fontSize}
                      onChange={(e) => updateTypography(index, 'fontSize', e.target.value)}
                      style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      {fontSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px' }}>Weight</label>
                    <select
                      value={typo.fontWeight}
                      onChange={(e) => updateTypography(index, 'fontWeight', e.target.value)}
                      style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      {fontWeightOptions.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px' }}>Style</label>
                    <select
                      value={typo.fontStyle}
                      onChange={(e) => updateTypography(index, 'fontStyle', e.target.value)}
                      style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      {fontStyleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px' }}>Line Height</label>
                    <select
                      value={typo.lineHeight}
                      onChange={(e) => updateTypography(index, 'lineHeight', e.target.value)}
                      style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    >
                      {lineHeightOptions.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'spacing':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {spacing.map((space, index) => (
              <div key={index} style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
                <strong>{space.name}</strong>
                <div style={{ width: space.size, height: '24px', backgroundColor: '#47A8E5', marginTop: '8px', marginBottom: '8px', borderRadius: '4px' }} />
                <select
                  value={space.size}
                  onChange={(e) => updateSpacing(index, e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {spacingOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  // Surfaces Tab Content
  const renderSurfacesContent = () => {
    return (
      <>
        <p style={{ marginBottom: '24px', color: '#666' }}>
          Define the main background colors for your application. These are applied to the body, cards, and elevated elements.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {/* Main Background */}
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: backgroundColors.background, borderRadius: '8px', border: '2px solid #ccc' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Main Background</strong>
                <select
                  value={backgroundColors.background}
                  onChange={(e) => updateBackgroundColor('background', e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Page background, body background</p>
          </div>

          {/* Surface */}
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: backgroundColors.surface, borderRadius: '8px', border: '2px solid #ccc' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Surface</strong>
                <select
                  value={backgroundColors.surface}
                  onChange={(e) => updateBackgroundColor('surface', e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Cards, panels, content areas</p>
          </div>

          {/* Elevated */}
          <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: backgroundColors.elevated, borderRadius: '8px', border: '2px solid #ccc' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Elevated</strong>
                <select
                  value={backgroundColors.elevated}
                  onChange={(e) => updateBackgroundColor('elevated', e.target.value)}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Modals, dropdowns, popovers</p>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h4 style={{ fontSize: '1rem', marginBottom: '12px', color: '#133A7C' }}>Preview</h4>
          <div style={{
            backgroundColor: backgroundColors.background,
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid #ccc',
          }}>
            <div style={{
              backgroundColor: backgroundColors.surface,
              padding: '16px',
              borderRadius: '6px',
              marginBottom: '12px',
            }}>
              <p style={{ margin: 0, color: backgroundColors.background === '#000000' || backgroundColors.background === '#1a1a1a' || backgroundColors.background === '#2d2d2d' || backgroundColors.background === '#111111' ? '#FFFFFF' : '#212121' }}>
                Surface content (cards, panels)
              </p>
            </div>
            <div style={{
              backgroundColor: backgroundColors.elevated,
              padding: '16px',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              <p style={{ margin: 0, color: backgroundColors.elevated === '#000000' || backgroundColors.elevated === '#1a1a1a' || backgroundColors.elevated === '#2d2d2d' || backgroundColors.elevated === '#111111' ? '#FFFFFF' : '#212121' }}>
                Elevated content (modals, popovers)
              </p>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Components Tab Content
  const renderComponentsContent = () => {
    switch (activeSubTab) {
      case 'buttons':
        return (
          <div style={{ display: 'grid', gap: '24px' }}>
            {(['primary', 'secondary', 'accent'] as const).map((type) => (
              <div key={type} style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
                <h3 style={{ textTransform: 'capitalize', marginBottom: '16px', color: '#081534' }}>{type} Button</h3>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    style={{
                      padding: '12px 24px',
                      backgroundColor: buttonStyles[type].bg,
                      color: buttonStyles[type].color,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '15px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)} Button
                  </button>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Background</label>
                      <select
                        value={buttonStyles[type].bg}
                        onChange={(e) => updateButtonStyle(type, 'bg', e.target.value)}
                        style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Hover</label>
                      <select
                        value={buttonStyles[type].hover}
                        onChange={(e) => updateButtonStyle(type, 'hover', e.target.value)}
                        style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Text Color</label>
                      <select
                        value={buttonStyles[type].color}
                        onChange={(e) => updateButtonStyle(type, 'color', e.target.value)}
                        style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'cards':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Preview Panel */}
            <div style={{
              padding: '32px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div
                style={{
                  backgroundColor: cardStyles.background,
                  color: cardStyles.foreground,
                  borderRadius: cardStyles.borderRadius,
                  border: `1px solid ${cardStyles.borderColor}`,
                  boxShadow: cardStyles.shadow,
                  padding: '24px',
                  width: '280px',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = cardStyles.hoverShadow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = cardStyles.shadow;
                }}
              >
                <h3 style={{
                  fontSize: cardStyles.titleFontSize,
                  fontWeight: cardStyles.titleFontWeight,
                  marginBottom: '12px',
                  color: cardStyles.foreground,
                }}>
                  Card Title
                </h3>
                <p style={{
                  fontSize: cardStyles.bodyFontSize,
                  fontWeight: cardStyles.bodyFontWeight,
                  color: cardStyles.foreground,
                  opacity: 0.8,
                  margin: 0,
                  lineHeight: 1.6,
                }}>
                  This is a preview of how cards will appear with your selected styles. Hover to see the hover shadow effect.
                </p>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Background</label>
                  <select
                    value={cardStyles.background}
                    onChange={(e) => updateCardStyle('background', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Text Color</label>
                  <select
                    value={cardStyles.foreground}
                    onChange={(e) => updateCardStyle('foreground', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Title Font Size</label>
                  <select
                    value={cardStyles.titleFontSize}
                    onChange={(e) => updateCardStyle('titleFontSize', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {fontSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Title Font Weight</label>
                  <select
                    value={cardStyles.titleFontWeight}
                    onChange={(e) => updateCardStyle('titleFontWeight', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {fontWeightOptions.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Body Font Size</label>
                  <select
                    value={cardStyles.bodyFontSize}
                    onChange={(e) => updateCardStyle('bodyFontSize', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {fontSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Body Font Weight</label>
                  <select
                    value={cardStyles.bodyFontWeight}
                    onChange={(e) => updateCardStyle('bodyFontWeight', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {fontWeightOptions.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Border Radius</label>
                  <select
                    value={cardStyles.borderRadius}
                    onChange={(e) => updateCardStyle('borderRadius', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {borderRadiusOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Border Color</label>
                  <select
                    value={cardStyles.borderColor}
                    onChange={(e) => updateCardStyle('borderColor', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Shadow</label>
                  <select
                    value={cardStyles.shadow}
                    onChange={(e) => updateCardStyle('shadow', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {shadowOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Hover Shadow</label>
                  <select
                    value={cardStyles.hoverShadow}
                    onChange={(e) => updateCardStyle('hoverShadow', e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {shadowOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Layout Tab Content
  const renderLayoutContent = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Preview Panel */}
        <div style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          overflow: 'hidden',
          height: '400px'
        }}>
          <div style={{
            backgroundColor: sidebarStyles.background,
            borderRight: `1px solid ${sidebarStyles.borderColor}`,
            height: '100%',
            padding: '16px 0',
          }}>
            <div style={{ padding: '0 16px', marginBottom: '16px' }}>
              <span style={{
                color: sidebarStyles.foreground,
                fontSize: sidebarStyles.fontSize,
                fontWeight: sidebarStyles.fontWeight,
                opacity: 0.7
              }}>
                NAVIGATION
              </span>
            </div>
            {['Dashboard', 'Workspaces', 'Settings'].map((item, idx) => (
              <div
                key={item}
                style={{
                  padding: '12px 16px',
                  backgroundColor: idx === 0 ? sidebarStyles.activeBackground : 'transparent',
                  color: idx === 0 ? sidebarStyles.activeForeground : sidebarStyles.foreground,
                  fontSize: sidebarStyles.fontSize,
                  fontWeight: sidebarStyles.fontWeight,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (idx !== 0) e.currentTarget.style.backgroundColor = sidebarStyles.hoverBackground;
                }}
                onMouseLeave={(e) => {
                  if (idx !== 0) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Background</label>
              <select
                value={sidebarStyles.background}
                onChange={(e) => updateSidebarStyle('background', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Text Color</label>
              <select
                value={sidebarStyles.foreground}
                onChange={(e) => updateSidebarStyle('foreground', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Active Background</label>
              <select
                value={sidebarStyles.activeBackground}
                onChange={(e) => updateSidebarStyle('activeBackground', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Active Text</label>
              <select
                value={sidebarStyles.activeForeground}
                onChange={(e) => updateSidebarStyle('activeForeground', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Hover Background</label>
              <select
                value={sidebarStyles.hoverBackground}
                onChange={(e) => updateSidebarStyle('hoverBackground', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Border Color</label>
              <select
                value={sidebarStyles.borderColor}
                onChange={(e) => updateSidebarStyle('borderColor', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Font Size</label>
              <select
                value={sidebarStyles.fontSize}
                onChange={(e) => updateSidebarStyle('fontSize', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {fontSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Font Weight</label>
              <select
                value={sidebarStyles.fontWeight}
                onChange={(e) => updateSidebarStyle('fontWeight', e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                {fontWeightOptions.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // States Tab Content
  const renderStatesContent = () => {
    return (
      <>
        <p style={{ marginBottom: '24px', color: '#666' }}>
          Define semantic colors for different states and feedback in your application.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {semanticColors.map((color, index) => (
            <div key={index} style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: 'white' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: color.hex, borderRadius: '8px', border: '2px solid #ccc' }} />
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => updateSemanticColor(index, 'name', e.target.value)}
                    style={{ width: '100%', padding: '6px', marginBottom: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                    placeholder="Color name"
                  />
                  <select
                    value={color.hex}
                    onChange={(e) => updateSemanticColor(index, 'hex', e.target.value)}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                  >
                    {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <input
                type="text"
                value={color.usage}
                onChange={(e) => updateSemanticColor(index, 'usage', e.target.value)}
                style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                placeholder="Usage description"
              />
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      <WizardPageNavigation />
      <AIPresetIndicator />
      {/* Workspace Header */}
      {currentWorkspace && (
        <div style={{
          backgroundColor: 'var(--color-primary)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h4 className="text-title3" style={{ margin: 0, color: 'white' }}>
            Workspace: {currentWorkspace.name}
          </h4>
        </div>
      )}

      {/* Header with Framework Selector */}
      <div style={{ marginBottom: '24px', backgroundColor: '#081534', padding: '24px 32px', borderRadius: '12px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '500', marginBottom: '8px', letterSpacing: '1px', color: 'white' }}>
              UI Styles Editor
            </h1>
            <p style={{ fontSize: '1rem', opacity: 0.9, color: 'white', margin: 0 }}>
              Customize your design system elements
            </p>
          </div>

          {/* Framework Selector */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedFrameworkId}
              onChange={(e) => {
                const newFrameworkId = e.target.value;
                if (hasChanges) {
                  if (confirm('You have unsaved changes. Switch style anyway?')) {
                    setSelectedFrameworkId(newFrameworkId);
                  }
                } else {
                  setSelectedFrameworkId(newFrameworkId);
                }
              }}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                minWidth: '200px',
              }}
            >
              <optgroup label="Default Frameworks">
                {frameworks.filter(f => !f.isCustom).map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </optgroup>
              {frameworks.some(f => f.isCustom) && (
                <optgroup label="Custom Frameworks">
                  {frameworks.filter(f => f.isCustom).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            <Button
              variant="primary"
              onClick={handleActivateStyle}
              disabled={!selectedFrameworkId || activatedFrameworkId === selectedFrameworkId}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: activatedFrameworkId === selectedFrameworkId ? 'rgba(76, 175, 80, 0.3)' : '#4caf50',
                cursor: activatedFrameworkId === selectedFrameworkId ? 'not-allowed' : 'pointer',
                border: 'none',
                color: 'white',
              }}
            >
              {activatedFrameworkId === selectedFrameworkId ? 'Activated' : 'Activate'}
            </Button>

            {selectedFramework?.isCustom && (
              <Button
                variant="outline"
                onClick={handleDeleteCustom}
                style={{ backgroundColor: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.5)', color: 'white', padding: '10px 16px' }}
              >
                Delete
              </Button>
            )}

            {hasChanges && (
              <>
                {selectedFramework?.isCustom && (
                  <Button
                    variant="primary"
                    onClick={handleUpdateExisting}
                    style={{ backgroundColor: '#47A8E5', padding: '10px 16px' }}
                  >
                    Update
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => setShowSaveModal(true)}
                  style={{ backgroundColor: '#4caf50', padding: '10px 16px' }}
                >
                  Save New
                </Button>
              </>
            )}
          </div>
        </div>

        {hasChanges && (
          <div style={{ marginTop: '16px', padding: '10px 16px', backgroundColor: 'rgba(255,204,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,204,0,0.5)' }}>
            <p style={{ color: 'white', fontSize: '13px', margin: 0 }}>
              You have unsaved changes. Save as a new custom framework or update the current one.
            </p>
          </div>
        )}
      </div>

      {/* Main Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '0',
        backgroundColor: '#f5f5f5',
        padding: '8px 8px 0 8px',
        borderRadius: '12px 12px 0 0',
      }}>
        {tabConfigs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '14px 24px',
              fontSize: '15px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#081534' : '#666',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0 0 12px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minHeight: '500px',
      }}>
        {/* Sub-Tab Navigation */}
        {currentTabConfig && currentTabConfig.subTabs.length > 1 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e5e5',
          }}>
            {currentTabConfig.subTabs.map((subTab) => (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: activeSubTab === subTab.id ? '600' : '400',
                  backgroundColor: activeSubTab === subTab.id ? '#081534' : '#f0f0f0',
                  color: activeSubTab === subTab.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {subTab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div style={{ padding: '24px 32px' }}>
          {renderTabContent()}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSaveModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '32px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Save as New Custom Framework</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Enter a name for your custom UI framework. It will be saved to this workspace and available in the dropdown.
            </p>
            <input
              type="text"
              value={newFrameworkName}
              onChange={(e) => setNewFrameworkName(e.target.value)}
              placeholder="e.g., My Custom Design System"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                marginBottom: '20px',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveModal(false);
                  setNewFrameworkName('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAsNew}
                disabled={!newFrameworkName.trim()}
              >
                Save Framework
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showActivationSuccess && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#4caf50',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          <span style={{ fontSize: '24px' }}>✓</span>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px' }}>UI Style Activated!</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>UI-STYLE.md has been generated</div>
          </div>
        </div>
      )}
    </div>
  );
};

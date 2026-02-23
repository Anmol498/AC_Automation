
export const INSTALLATION_PHASES = [
  "Drain pipe",
  "Remote pipe",
  "Wall opening",
  "Supporting",
  "Copper piping (payment)",
  "Leak testing",
  "Dressing",
  "Communication wiring",
  "Ducting",
  "Indoor Unit Installation",
  "Grill fitting",
  "Outdoor fittings (payment)",
  "Pressure stand",
  "Vacuum",
  "Gas charging",
  "Remote fitting",
  "Commissioning (payment)"
];

export const SERVICE_PHASES = [
  "Initial System Inspection",
  "Filter & Coil Cleaning",
  "Gas Level & Pressure Check",
  "Component Repair/Replacement",
  "Final Testing & Payment"
];

// For legacy support or general reference
export const AC_PHASES = INSTALLATION_PHASES;

export const APP_NAME = "CoolBreeze AC Services";
export const SUPPORT_EMAIL = "support@coolbreezeac.com";
export const SUPPORT_PHONE = "+1 (555) 123-4567";

// Intelligent API URL detection
export const API_BASE_URL = 
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export interface Rules {
  require_otp: boolean;
  jwt_expiry_hours: number;
  block_expired_colleges: boolean;
  max_login_attempts: number;
  allow_late_submissions: boolean;
  late_penalty_pct: number;
  max_submission_size_mb: number;
  auto_grade: boolean;
  notify_new_announcement: boolean;
  notify_assignment_due: boolean;
  reminder_hours_before: number;
  notify_new_student: boolean;
  default_workshop_visibility: string;
  require_instructor_approval: boolean;
  max_students_per_workshop: number;
  allow_self_enrollment: boolean;
  maintenance_mode: boolean;
  default_theme: string;
  forum_enabled: boolean;
  sandbox_enabled: boolean;
}

const DEFAULTS: Rules = {
  require_otp: true,
  jwt_expiry_hours: 24,
  block_expired_colleges: true,
  max_login_attempts: 5,
  allow_late_submissions: true,
  late_penalty_pct: 10,
  max_submission_size_mb: 50,
  auto_grade: false,
  notify_new_announcement: true,
  notify_assignment_due: true,
  reminder_hours_before: 24,
  notify_new_student: true,
  default_workshop_visibility: 'College Only',
  require_instructor_approval: false,
  max_students_per_workshop: 200,
  allow_self_enrollment: true,
  maintenance_mode: false,
  default_theme: 'Dark',
  forum_enabled: true,
  sandbox_enabled: true,
};

interface RulesContextType {
  rules: Rules;
  loading: boolean;
  refresh: () => void;
}

const RulesContext = createContext<RulesContextType>({
  rules: DEFAULTS,
  loading: true,
  refresh: () => {},
});

export function GlobalRulesProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = useState<Rules>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/global-rules`);
      setRules({ ...DEFAULTS, ...res.data });
    } catch {
      // Use defaults if API unavailable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <RulesContext.Provider value={{ rules, loading, refresh: load }}>
      {children}
    </RulesContext.Provider>
  );
}

export const useGlobalRules = () => useContext(RulesContext);

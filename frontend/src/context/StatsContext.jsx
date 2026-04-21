import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getStats } from "../api/words.js";
import { useAuth } from "./AuthContext.jsx";

/**
 * Polls ``GET /api/words/stats/`` whenever there's a signed-in user, so any
 * component can read ``{ due_today, new_cards, total_words, streak_days }``
 * without making duplicate requests.
 *
 * Also exposes ``refresh()`` so the Study page can ping it after each
 * review to keep the Navbar badge in sync.
 */
const StatsContext = createContext(null);

const EMPTY_STATS = {
  due_today: 0,
  new_cards: 0,
  total_words: 0,
  streak_days: 0,
  next_due: null,
};

export function StatsProvider({ children }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setStats(EMPTY_STATS);
      return EMPTY_STATS;
    }
    setLoading(true);
    try {
      const data = await getStats();
      setStats(data);
      return data;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <StatsContext.Provider value={{ stats, loading, refresh }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStats must be used inside <StatsProvider>");
  return ctx;
}

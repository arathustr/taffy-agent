import { create } from 'zustand';
import type { AgentEvent, AgentSnapshot } from '../shared/contracts';

interface TaffyState {
  snapshot?: AgentSnapshot;
  events: AgentEvent[];
  activeTab: 'chat' | 'tasks' | 'sprites' | 'settings' | 'logs';
  setSnapshot: (snapshot: AgentSnapshot) => void;
  pushEvent: (event: AgentEvent) => void;
  setActiveTab: (tab: TaffyState['activeTab']) => void;
}

export const useTaffyStore = create<TaffyState>((set) => ({
  events: [],
  activeTab: 'chat',
  setSnapshot: (snapshot) => set({ snapshot }),
  pushEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 160),
      snapshot: state.snapshot ? { ...state.snapshot, lastEvent: event } : state.snapshot
    })),
  setActiveTab: (activeTab) => set({ activeTab })
}));

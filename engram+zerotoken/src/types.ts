export type MemoryType =
  | 'general' | 'config' | 'architecture' | 'error_solution'
  | 'preference' | 'learned_pattern' | 'conversation' | 'command'

export type MemorySource =
  | 'manual' | 'tool' | 'auto_keyword' | 'auto_error_fix'
  | 'auto_compaction' | 'auto_architecture'

export type MemoryScope = 'global' | 'project' | 'both'

export interface MemoryRecord {
  id: string; title: string; content: string; type: MemoryType
  source: MemorySource; importance: number; access_count: number
  last_accessed_at: string | null; created_at: string; updated_at: string | null
}

export interface SaveParams { title: string; content: string; type?: MemoryType; source?: MemorySource; importance?: number }
export interface SearchParams { query: string; types?: MemoryType[]; limit?: number; min_importance?: number }
export interface SearchMatch extends MemoryRecord { score: number }
export interface AutoSaveConfig { keywords: boolean; error_fix: boolean; compaction: boolean; architecture: boolean }
export interface InjectionConfig { enabled: boolean; max_memories: number; max_tokens: number }
export interface EngramOptions { global_dir?: string; auto_save?: Partial<AutoSaveConfig>; injection?: Partial<InjectionConfig> }
export interface AutoSaveCandidate { title: string; content: string; type: MemoryType; source: MemorySource; importance: number }

export const DEFAULT_OPTIONS: Required<EngramOptions> = {
  global_dir: '',
  auto_save: { keywords: true, error_fix: true, compaction: true, architecture: true },
  injection: { enabled: true, max_memories: 3, max_tokens: 1500 },
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { usePDF } from '@/contexts/pdf-context';
import { loadDocumentFromBytes, getPageText } from '@/lib/pdf-engine';

interface SearchResult {
  page: number;
  count: number;
}

export default function SearchPanel() {
  const { state, dispatch } = usePDF();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageTextsCache = useRef<Map<number, string>>(new Map());
  const cachedPdfDataRef = useRef<ArrayBuffer | null>(null);
  const totalMatches = results.reduce((sum, r) => sum + r.count, 0);

  // Ctrl+F で開閉
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const doSearch = useCallback(async () => {
    if (!query.trim() || !state.pdfData) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      // PDF変更時にキャッシュクリア
      if (cachedPdfDataRef.current !== state.pdfData) {
        pageTextsCache.current.clear();
        cachedPdfDataRef.current = state.pdfData;
      }

      const doc = await loadDocumentFromBytes(state.pdfData);
      const found: SearchResult[] = [];
      const q = query.toLowerCase();
      for (let i = 1; i <= doc.numPages; i++) {
        let text = pageTextsCache.current.get(i);
        if (text === undefined) {
          text = await getPageText(doc, i);
          pageTextsCache.current.set(i, text);
        }
        const lower = text.toLowerCase();
        let count = 0;
        let pos = 0;
        while ((pos = lower.indexOf(q, pos)) !== -1) {
          count++;
          pos += q.length;
        }
        if (count > 0) found.push({ page: i, count });
      }
      doc.destroy();
      setResults(found);
      setCurrentIdx(0);
      if (found.length > 0) {
        dispatch({ type: 'SET_PAGE', payload: found[0].page });
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, state.pdfData, dispatch]);

  // Enter で検索実行
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) handlePrev();
      else if (results.length > 0) handleNext();
      else doSearch();
    }
  };

  const handleNext = () => {
    if (results.length === 0) return;
    const next = (currentIdx + 1) % results.length;
    setCurrentIdx(next);
    dispatch({ type: 'SET_PAGE', payload: results[next].page });
  };

  const handlePrev = () => {
    if (results.length === 0) return;
    const prev = (currentIdx - 1 + results.length) % results.length;
    setCurrentIdx(prev);
    dispatch({ type: 'SET_PAGE', payload: results[prev].page });
  };

  if (!state.pdfData) return null;

  return (
    <>
      {/* 検索トリガーボタン（ヘッダー用） */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="fixed top-2 right-[8.5rem] z-[65] dq-btn-small flex items-center justify-center"
          style={{ minWidth: 36, minHeight: 36, background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', borderColor: 'var(--window-border)', color: 'var(--ynk-bone)' }}
          title="検索 (Ctrl+F)"
          aria-label="テキスト検索"
        >
          <Search size={16} />
        </button>
      )}

      {/* 検索バー */}
      {isOpen && (
        <div
          className="fixed top-0 left-0 right-0 z-[65] dq-window"
          style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '8px 12px' }}
        >
          <div className="flex items-center gap-2">
            <Search size={16} style={{ color: 'var(--ynk-gold)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="テキストを検索..."
              className="dq-input flex-1"
              style={{ padding: '6px 10px', fontSize: 14, minHeight: 36 }}
              autoFocus
            />
            <button onClick={doSearch} className="dq-btn-small" style={{ minHeight: 36, minWidth: 50 }} disabled={searching}>
              {searching ? '...' : '検索'}
            </button>
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className="dq-btn-small flex items-center justify-center" style={{ minWidth: 32, minHeight: 32, background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', borderColor: 'var(--window-border)', color: 'var(--ynk-bone)' }} disabled={results.length === 0}>
                <ChevronUp size={14} />
              </button>
              <button onClick={handleNext} className="dq-btn-small flex items-center justify-center" style={{ minWidth: 32, minHeight: 32, background: 'linear-gradient(180deg, #5c3d2e 0%, #3d2a1e 100%)', borderColor: 'var(--window-border)', color: 'var(--ynk-bone)' }} disabled={results.length === 0}>
                <ChevronDown size={14} />
              </button>
            </div>
            {totalMatches > 0 && (
              <span className="dq-text text-xs whitespace-nowrap" style={{ color: 'var(--ynk-gold)' }}>
                {currentIdx + 1}/{results.length}p ({totalMatches}件)
              </span>
            )}
            {query && results.length === 0 && !searching && (
              <span className="dq-text text-xs whitespace-nowrap" style={{ color: '#ef4444' }}>
                0件
              </span>
            )}
            <button
              onClick={() => { setIsOpen(false); setQuery(''); setResults([]); }}
              className="flex items-center justify-center"
              style={{ color: 'var(--ynk-bone)', minWidth: 28, minHeight: 28 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect } from 'react';

/** Set the document title for a page (`LearnAI · Dashboard`). */
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · LearnAI` : 'LearnAI — Practice. Build. Improve.';
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default useDocumentTitle;

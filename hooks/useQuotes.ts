import { useEffect, useState } from 'react';
import { Quote, QuoteCategory } from '../types/quotes';
import {
  DEFAULT_QUOTE_CATEGORY_ID,
  createQuote as createQuoteInDb,
  createQuoteCategory as createQuoteCategoryInDb,
  deleteQuote as deleteQuoteInDb,
  getQuotes,
  getQuoteCategories,
  moveQuotesToCategory as moveQuotesToCategoryInDb,
  pinQuotes as pinQuotesInDb,
  updateQuote as updateQuoteInDb,
} from '../database/quotesDb';

type QuoteDraft = {
  id?: string;
  quote_text: string;
  background_image_uri?: string | null;
  quote_category_id?: string;
  pinned?: number;
  editor_config?: Quote['editor_config'] | null;
};

export default function useQuotesStore() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteCategories, setQuoteCategories] = useState<QuoteCategory[]>([]);

  const refreshQuoteCategories = async () => {
    setQuoteCategories(await getQuoteCategories());
  };

  const refreshAll = async () => {
    const [currentQuotes, currentCategories] = await Promise.all([getQuotes(), getQuoteCategories()]);
    setQuotes(currentQuotes);
    setQuoteCategories(currentCategories);
  };

  useEffect(() => {
    let isMounted = true;

    const loadQuotes = async () => {
      const [currentQuotes, currentCategories] = await Promise.all([getQuotes(), getQuoteCategories()]);
      if (isMounted) {
        setQuotes(currentQuotes);
        setQuoteCategories(currentCategories);
      }
    };

    loadQuotes();

    return () => {
      isMounted = false;
    };
  }, []);

  const createQuote = async (quote: QuoteDraft) => {
    const savedQuote = (await createQuoteInDb({
      id: quote.id,
      quote_text: quote.quote_text,
      background_image_uri: quote.background_image_uri ?? null,
      quote_category_id: quote.quote_category_id ?? DEFAULT_QUOTE_CATEGORY_ID,
      pinned: quote.pinned ?? 0,
      editor_config: quote.editor_config ?? null,
    })) as Quote;
    await refreshAll();
    return savedQuote;
  };

  const updateQuote = async (updatedQuote: Quote) => {
    const savedQuote = (await updateQuoteInDb(updatedQuote)) as Quote;
    await refreshAll();
    return savedQuote;
  };

  const deleteQuote = async (quoteId: string) => {
    await deleteQuoteInDb(quoteId);
    await refreshAll();
  };

  const createQuoteCategory = async (name: string) => {
    const category = await createQuoteCategoryInDb({ name });
    await refreshQuoteCategories();
    return category;
  };

  const moveQuotesToCategory = async (quoteIds: string[], quoteCategoryId: string) => {
    await moveQuotesToCategoryInDb(quoteIds, quoteCategoryId);
    await refreshAll();
  };

  const pinQuotes = async (quoteIds: string[], pinned = true) => {
    await pinQuotesInDb(quoteIds, pinned);
    await refreshAll();
  };

  return {
    quotes,
    quoteCategories,
    createQuote,
    updateQuote,
    deleteQuote,
    createQuoteCategory,
    moveQuotesToCategory,
    pinQuotes,
  };
}

import { useEffect, useState } from 'react';
import { Quote } from '../types/quotes';
import {
  createQuote as createQuoteInDb,
  deleteQuote as deleteQuoteInDb,
  getQuotes,
  updateQuote as updateQuoteInDb,
} from '../database/quotesDb';

type QuoteDraft = {
  quote_text: string;
  background_image_uri?: string | null;
  editor_config?: Quote['editor_config'] | null;
};

export default function useQuotesStore() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const refreshQuotes = async () => {
    setQuotes(await getQuotes());
  };

  useEffect(() => {
    let isMounted = true;

    const loadQuotes = async () => {
      const currentQuotes = await getQuotes();
      if (isMounted) {
        setQuotes(currentQuotes);
      }
    };

    loadQuotes();

    return () => {
      isMounted = false;
    };
  }, []);

  const createQuote = async (quote: QuoteDraft) => {
    const savedQuote = (await createQuoteInDb({
      quote_text: quote.quote_text,
      background_image_uri: quote.background_image_uri ?? null,
      editor_config: quote.editor_config ?? null,
    })) as Quote;
    await refreshQuotes();
    return savedQuote;
  };

  const updateQuote = async (updatedQuote: Quote) => {
    const savedQuote = (await updateQuoteInDb(updatedQuote)) as Quote;
    await refreshQuotes();
    return savedQuote;
  };

  const deleteQuote = async (quoteId: string) => {
    await deleteQuoteInDb(quoteId);
    await refreshQuotes();
  };

  return {
    quotes,
    createQuote,
    updateQuote,
    deleteQuote,
  };
}

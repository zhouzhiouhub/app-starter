import { useCallback, useState } from "react";
import type { PageSchema } from "@app-starter/schema";

const HISTORY_LIMIT = 50;

interface SchemaHistoryState {
  future: PageSchema[];
  past: PageSchema[];
  present: PageSchema | null;
}

export function useSchemaHistory() {
  const [history, setHistory] = useState<SchemaHistoryState>({
    future: [],
    past: [],
    present: null,
  });

  const resetSchema = useCallback((schema: PageSchema) => {
    setHistory({
      future: [],
      past: [],
      present: schema,
    });
  }, []);

  const commitSchema = useCallback((schema: PageSchema) => {
    setHistory((current) => {
      if (!current.present) {
        return {
          future: [],
          past: [],
          present: schema,
        };
      }

      if (current.present === schema) {
        return current;
      }

      return {
        future: [],
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: schema,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past[current.past.length - 1];

      if (!previous || !current.present) {
        return current;
      }

      return {
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
        past: current.past.slice(0, -1),
        present: previous,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];

      if (!next || !current.present) {
        return current;
      }

      return {
        future: current.future.slice(1),
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
      };
    });
  }, []);

  return {
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    commitSchema,
    redo,
    resetSchema,
    schema: history.present,
    undo,
  };
}

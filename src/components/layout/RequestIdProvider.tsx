'use client';
import { createContext, useContext, type ReactNode } from 'react';
const RequestIdContext = createContext('unavailable');
export function RequestIdProvider({
  requestId,
  children,
}: {
  requestId: string;
  children: ReactNode;
}) {
  return (
    <RequestIdContext.Provider value={requestId}>
      {children}
    </RequestIdContext.Provider>
  );
}
export function useRequestId() {
  return useContext(RequestIdContext);
}

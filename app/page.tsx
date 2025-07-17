import { Suspense } from "react";
import { EventProvider } from "@/app/contexts/EventContext";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import App from "./App";

export default function Page() {
  return (
    <div className="h-full min-h-full bg-gray-100">
      <Suspense fallback={<div>Loading...</div>}>
        <TranscriptProvider>
          <EventProvider>
            <App />
          </EventProvider>
        </TranscriptProvider>
      </Suspense>
    </div>
  );
}

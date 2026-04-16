import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { RFIDProvider } from "./contexts/RFIDContext";

export default function App() {
  return (
    <div className="w-full h-screen overflow-hidden bg-gray-50">
      <RFIDProvider>
        <RouterProvider router={router} />
        <Toaster />
      </RFIDProvider>
    </div>
  );
}
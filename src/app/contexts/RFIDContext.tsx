import React, { createContext, useContext, useState, useCallback, useRef } from "react";

interface RFIDContextType {
  serialPort: any | null;
  portStatus: "disconnected" | "connecting" | "connected";
  connectToSerialPort: () => Promise<void>;
  disconnectSerialPort: () => Promise<void>;
  isManuallyDisconnected: boolean;
}

const RFIDContext = createContext<RFIDContextType | undefined>(undefined);

export function RFIDProvider({ children }: { children: React.ReactNode }) {
  const [serialPort, setSerialPort] = useState<any | null>(null);
  const [portStatus, setPortStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);

  const readerRef = useRef<any | null>(null);
  // ✅ FIX #7: Gunakan ref untuk flag agar tidak stale di dalam closure async
  const isManuallyDisconnectedRef = useRef(false);

  const connectToSerialPort = useCallback(async () => {
    try {
      setPortStatus("connecting");
      // ✅ Reset flag di ref dan state sekaligus
      isManuallyDisconnectedRef.current = false;
      setIsManuallyDisconnected(false);

      const ports = await (navigator as any).serial.getPorts();
      let selectedPort: any | null = null;

      for (const port of ports) {
        const info = port.getInfo();
        if (info.path?.includes("COM7") || info.path?.includes("/dev/ttyUSB")) {
          selectedPort = port;
          break;
        }
      }

      if (!selectedPort) {
        selectedPort = await (navigator as any).serial.requestPort({
          filters: [{ usbVendorId: 0x2341 }],
        });
      }

      await selectedPort.open({ baudRate: 9600 });

      setSerialPort(selectedPort);
      setPortStatus("connected");

      if (selectedPort.readable) {
        const reader = selectedPort.readable.getReader();
        readerRef.current = reader;
        readSerialData(reader).catch((err) => {
          console.error("Serial read error:", err);
          // ✅ FIX: baca dari ref, bukan dari closure state
          if (!isManuallyDisconnectedRef.current) {
            setPortStatus("disconnected");
          }
        });
      }
    } catch (error) {
      console.error("Error connecting to serial port:", error);
      setPortStatus("disconnected");
    }
  }, []);

  const disconnectSerialPort = useCallback(async () => {
    try {
      // ✅ Set ref DULU sebelum cancel reader, agar readSerialData tidak salah set status
      isManuallyDisconnectedRef.current = true;
      setIsManuallyDisconnected(true);

      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (serialPort) {
        await serialPort.close();
        setSerialPort(null);
      }
      setPortStatus("disconnected");
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  }, [serialPort]);

  const readSerialData = async (reader: any) => {
    try {
      let buffer = "";

      while (true) {
        // ✅ FIX: cek ref bukan state variable yang stale
        if (isManuallyDisconnectedRef.current) break;

        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        buffer += text;

        const lines = buffer.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();

          if (line.startsWith("CARD_ID:")) {
            const cardId = line.replace("CARD_ID:", "").trim();
            if (cardId && cardId.length > 0) {
              console.log("Card detected from COM7:", cardId);
              window.dispatchEvent(new CustomEvent("rfidCardDetected", { detail: { cardId } }));
            }
          }
        }

        buffer = lines[lines.length - 1];
      }
    } catch (error) {
      console.error("Error reading serial data:", error);
      if (!isManuallyDisconnectedRef.current) {
        setPortStatus("disconnected");
      }
    }
  };

  return (
    <RFIDContext.Provider value={{ serialPort, portStatus, connectToSerialPort, disconnectSerialPort, isManuallyDisconnected }}>
      {children}
    </RFIDContext.Provider>
  );
}

export function useRFID() {
  const context = useContext(RFIDContext);
  if (!context) throw new Error("useRFID must be used within RFIDProvider");
  return context;
}

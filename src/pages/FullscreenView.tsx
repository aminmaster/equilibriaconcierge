import Concierge from "./Concierge";

export default function FullscreenView() {
  return (
    <div className="h-screen w-screen fixed inset-0 z-50 bg-background">
      <Concierge />
    </div>
  );
}
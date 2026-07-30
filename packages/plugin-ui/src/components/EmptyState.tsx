import { PanelsTopLeft } from "lucide-react";

export const EmptyState = () => (
  <div className="center-state empty-state">
    <PanelsTopLeft size={28} strokeWidth={1.5} />
    <span>Select a frame or layer</span>
  </div>
);

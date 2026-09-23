"use client";

import { closeKitchen, useUi } from "@/lib/ui-store";
import { KitchenPanel } from "./kitchen-panel";
import { Modal } from "./modal";

/** "Mano virtuvė" opens over any page, so the current search and results stay. */
export function KitchenDrawer() {
  const { kitchenOpen } = useUi();
  return (
    <Modal open={kitchenOpen} onClose={closeKitchen} labelledBy="kitchen-drawer-title" className="drawer">
      <button type="button" className="modal-close" onClick={closeKitchen} aria-label="Uždaryti Mano virtuvę">×</button>
      <KitchenPanel titleId="kitchen-drawer-title" onSearch={closeKitchen} />
    </Modal>
  );
}

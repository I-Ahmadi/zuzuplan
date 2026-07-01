import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LogoutConfirmationDialog({ open, pending, onCancel, onConfirm }) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log out of Sprintly?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            You will need to sign in again to access your workspace on this device.
          </p>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            <LogOut className="h-4 w-4" />
            {pending ? "Logging out..." : "Log out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

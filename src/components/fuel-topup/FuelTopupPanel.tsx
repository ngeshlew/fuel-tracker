import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FuelTopupForm } from './FuelTopupForm';
import { useFuelStore } from '../../store/useFuelStore';

interface FuelTopupPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FuelTopupPanel: React.FC<FuelTopupPanelProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { toggleTopupPanel } = useFuelStore();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        toggleTopupPanel(false);
      }
    }}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col p-0">
        <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <SheetTitle>Add Fuel Topup</SheetTitle>
          <SheetDescription>
            Record a new fuel topup with litres, cost, and optional mileage.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          <FuelTopupForm onSuccess={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
};


import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MileageEntryForm } from './MileageEntryForm';
import { MileageEntry } from '../../types';
import { ErrorBoundary } from '../ErrorBoundary';

interface MileageEntryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: MileageEntry;
}

export const MileageEntryPanel: React.FC<MileageEntryPanelProps> = ({
  isOpen,
  onClose,
  entryToEdit
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-lg font-normal uppercase tracking-wide">
            {entryToEdit ? 'Edit Mileage' : 'Add Mileage'}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {entryToEdit 
              ? 'Update your mileage entry details' 
              : 'Record your current odometer reading or trip details'}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          <ErrorBoundary>
            <MileageEntryForm onSuccess={onClose} initialData={entryToEdit} />
          </ErrorBoundary>
        </div>
      </SheetContent>
    </Sheet>
  );
};


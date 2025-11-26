import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Icon } from '@/components/ui/icon';
import { useMileageStore } from '@/store/useMileageStore';
import { MileageEntry } from '../../types';

interface MileageLogProps {
  onEdit: (entry: MileageEntry) => void;
}

const tripPurposeLabels: Record<string, string> = {
  COMMUTE: 'Commute',
  BUSINESS: 'Business',
  LEISURE: 'Leisure',
  HOLIDAY: 'Holiday',
  OTHER: 'Other',
};

const tripPurposeColors: Record<string, string> = {
  COMMUTE: 'bg-blue-500/10 text-blue-500',
  BUSINESS: 'bg-purple-500/10 text-purple-500',
  LEISURE: 'bg-green-500/10 text-green-500',
  HOLIDAY: 'bg-orange-500/10 text-orange-500',
  OTHER: 'bg-gray-500/10 text-gray-500',
};

export const MileageLog: React.FC<MileageLogProps> = ({ onEdit }) => {
  const { entries, deleteEntry, toggleEntryPanel } = useMileageStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<MileageEntry | null>(null);

  // Sort entries by date (most recent first)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate miles driven between consecutive entries
  const calculateMilesDriven = (entry: MileageEntry): number | null => {
    const sortedByDate = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const currentIndex = sortedByDate.findIndex((e) => e.id === entry.id);
    
    if (currentIndex === 0) return null; // First entry, no previous reading
    
    const previousEntry = sortedByDate[currentIndex - 1];
    return entry.odometerReading - previousEntry.odometerReading;
  };

  const handleDeleteClick = (entry: MileageEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (entryToDelete) {
      await deleteEntry(entryToDelete.id);
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  return (
    <>
      <Card className="border-dotted">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-normal uppercase tracking-wide">
              Mileage History
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage your mileage entries
            </p>
          </div>
          <Button 
            onClick={() => toggleEntryPanel(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Icon name="add-new-plus" className="h-4 w-4" />
            Add Entry
          </Button>
        </CardHeader>
        <CardContent>
          {sortedEntries.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="speedometer" className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-normal mb-2">No mileage entries yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your mileage by adding your first odometer reading
              </p>
              <Button onClick={() => toggleEntryPanel(true)}>
                <Icon name="add-new-plus" className="h-4 w-4 mr-2" />
                Add First Entry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Odometer</TableHead>
                    <TableHead className="text-right">Miles Driven</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => {
                    const milesDriven = calculateMilesDriven(entry);
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(entry.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {entry.odometerReading.toLocaleString()} mi
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {milesDriven !== null ? (
                            <span className={milesDriven > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                              {milesDriven > 0 ? `+${milesDriven.toLocaleString()}` : '—'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.tripPurpose ? (
                            <Badge 
                              variant="secondary" 
                              className={tripPurposeColors[entry.tripPurpose]}
                            >
                              {tripPurposeLabels[entry.tripPurpose]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.type === 'FUEL_LINKED' ? (
                            <Badge 
                              variant="outline" 
                              className="border-primary/50 bg-primary/5"
                            >
                              <Icon name="fuel" className="h-3 w-3 mr-1" />
                              Fuel Linked
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Manual
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {entry.type !== 'FUEL_LINKED' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEdit(entry)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Icon name="edit" className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(entry)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Icon name="trash-delete" className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {entry.type === 'FUEL_LINKED' && (
                              <span className="text-xs text-muted-foreground">
                                Auto-synced
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mileage Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mileage entry from{' '}
              {entryToDelete && format(new Date(entryToDelete.date), 'dd MMM yyyy')}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFuelStore } from '../../store/useFuelStore';
import { FuelTopup } from '../../types';
import { exportToCSV, exportToJSON } from '../../utils/exportData';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FuelTopupsLogProps {
  onEdit?: (topup: FuelTopup) => void;
  onDelete?: (id: string) => void;
}

export const FuelTopupsLog: React.FC<FuelTopupsLogProps> = ({
  onEdit,
  onDelete
}) => {
  const { topups, isLoading, deleteTopup, removeEstimatedTopup } = useFuelStore();
  const [selectedTopup, setSelectedTopup] = useState<FuelTopup | null>(null);
  const [topupPendingDelete, setTopupPendingDelete] = useState<FuelTopup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MANUAL' | 'ESTIMATED'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target !== searchInputRef.current
      ) {
        return;
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const confirmDelete = (topup: FuelTopup) => {
    setDeleteError(null);
    setTopupPendingDelete(topup);
  };

  const handleDelete = async () => {
    if (!topupPendingDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (topupPendingDelete.type === 'ESTIMATED') {
        await removeEstimatedTopup(topupPendingDelete.id);
      } else {
        await deleteTopup(topupPendingDelete.id);
        if (onDelete) onDelete(topupPendingDelete.id);
      }
      setTopupPendingDelete(null);
    } catch (error) {
      console.error('Failed to delete topup:', error);
      setDeleteError('Failed to delete topup. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal uppercase tracking-wide mb-4">Topup History</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-full sm:w-[180px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter and search topups
  const filteredTopups = topups.filter(topup => {
    if (filterType !== 'ALL' && topup.type !== filterType) {
      return false;
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const dateStr = formatDate(topup.date).toLowerCase();
      const litresStr = topup.litres.toString();
      const notesStr = (topup.notes || '').toLowerCase();
      
      return dateStr.includes(query) || 
             litresStr.includes(query) || 
             notesStr.includes(query);
    }
    
    return true;
  });

  const sortedTopups = [...filteredTopups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group topups by month
  const groupTopupsByMonth = (topups: FuelTopup[]) => {
    const groups: { [key: string]: FuelTopup[] } = {};
    
    topups.forEach(topup => {
      const date = new Date(topup.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(topup);
    });
    
    return Object.entries(groups)
      .map(([key, topups]) => {
        const date = new Date(topups[0].date);
        const monthLabel = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
        return {
          key,
          label: monthLabel,
          topups: topups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  };

  const monthGroups = groupTopupsByMonth(sortedTopups);

  if (!isLoading && topups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold uppercase tracking-wide">Topup History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Icon name="lightning-energy" className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-normal mb-2">No topups yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Start tracking your fuel consumption by adding your first topup.
            </p>
            <Button 
              onClick={() => {
                const { toggleTopupPanel } = useFuelStore.getState();
                toggleTopupPanel(true);
              }}
              size="lg"
              className="min-w-[200px]"
            >
              <Icon name="add-new-plus" className="h-5 w-5 mr-2" />
              Add Your First Topup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!isLoading && topups.length > 0 && sortedTopups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal uppercase tracking-wide mb-4">Topup History</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="SEARCH TOPUPS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(value: 'ALL' | 'MANUAL' | 'ESTIMATED') => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Icon name="filter" className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Topups</SelectItem>
                <SelectItem value="MANUAL">Manual Only</SelectItem>
                <SelectItem value="ESTIMATED">Estimated Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Icon name="search" className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-normal mb-2">No topups found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No topups match your search "{searchQuery}"{filterType !== 'ALL' && ` and filter "${filterType}"`}
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilterType('ALL');
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card role="region" aria-label="Fuel topup history" className="bg-transparent w-full" style={{ padding: 'var(--space-md)' }}>
      <CardHeader className="mb-6" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4" style={{ marginBottom: 'var(--space-lg)' }}>
          <CardTitle className="text-lg font-semibold uppercase tracking-wide">Topup History</CardTitle>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground uppercase tracking-normal font-mono">
              {sortedTopups.length} of {topups.length} {topups.length === 1 ? 'topup' : 'topups'}
            </span>
            <div className="flex gap-2" role="group" aria-label="Export options">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(sortedTopups)}
                className="h-9 text-xs uppercase tracking-normal font-mono"
                aria-label="Export topups as CSV"
              >
                <Icon name="download" className="h-3 w-3 mr-2" aria-hidden="true" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToJSON(sortedTopups)}
                className="h-9 text-xs uppercase tracking-normal font-mono"
                aria-label="Export topups as JSON"
              >
                <Icon name="download" className="h-3 w-3 mr-2" aria-hidden="true" />
                JSON
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="SEARCH TOPUPS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-16 h-10 sm:h-9 text-sm"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 button__shortcut" aria-label="Keyboard shortcut: /">
              /
            </span>
          </div>
          
          <Select value={filterType} onValueChange={(value: 'ALL' | 'MANUAL' | 'ESTIMATED') => setFilterType(value)}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9">
              <Icon name="filter" className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Topups</SelectItem>
              <SelectItem value="MANUAL">Manual Only</SelectItem>
              <SelectItem value="ESTIMATED">Estimated Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            
            {monthGroups.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No topups found
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={[]} className="w-full">
                {monthGroups.map((group, groupIndex) => (
                    <AccordionItem key={group.key} value={group.key} className="border-none">
                    <AccordionTrigger className="py-3 hover:no-underline hover:opacity-70" style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
                      <h3 className="text-base uppercase tracking-wide font-mono">{group.label}</h3>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4" style={{ paddingTop: 'var(--space-lg)' }}>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-dotted">
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Date</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Retailer</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Location</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Grade</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Litres</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Cost/Litre</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Net Price</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>VAT</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Total Cost</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Mileage</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Fuel Type</TableHead>
                              <TableHead style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Status</TableHead>
                              <TableHead className="text-right" style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.topups.map((topup) => {
                              return (
                                <TableRow key={topup.id}>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>{formatDate(topup.date)}</TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>{topup.retailer || '-'}</TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
                                    {topup.locationName ? (
                                      <div className="text-xs">
                                        <div className="font-medium">{topup.locationName}</div>
                                        {topup.address && (
                                          <div className="text-muted-foreground truncate max-w-[200px]" title={topup.address}>
                                            {topup.address}
                                          </div>
                                        )}
                                      </div>
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
                                    {topup.fuelGrade ? topup.fuelGrade.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '-'}
                                  </TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>{topup.litres.toFixed(2)} L</TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>£{topup.costPerLitre.toFixed(2)}</TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
                                    {topup.netPrice ? `£${topup.netPrice.toFixed(2)}` : '-'}
                                  </TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
                                    {topup.vatAmount ? `£${topup.vatAmount.toFixed(2)}${topup.vatRate ? ` (${topup.vatRate}%)` : ''}` : '-'}
                                  </TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>£{topup.totalCost.toFixed(2)}</TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>{topup.mileage ? `${topup.mileage.toLocaleString()}` : '-'}</TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>{topup.fuelType || '-'}</TableCell>
                                  <TableCell style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
                                    <span className="text-xs uppercase tracking-normal font-mono">
                                      {topup.type === "MANUAL" ? (
                                        <span className="text-foreground">■ MANUAL</span>
                                      ) : (
                                        <span className="text-muted-foreground">○ ESTIMATED</span>
                                      )}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right" style={{ paddingTop: 'var(--space-md)', paddingBottom: 'var(--space-md)' }}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                          <span className="sr-only">Open menu</span>
                                          <Icon name="more-horizontal" className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => setSelectedTopup(topup)}>
                                          <Icon name="eye-password" className="mr-2 h-4 w-4" />
                                          View
                                        </DropdownMenuItem>
                                        {onEdit && (
                                          <DropdownMenuItem onClick={() => onEdit(topup)}>
                                            <Icon name="edit-write" className="mr-2 h-4 w-4" />
                                            Edit
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={() => confirmDelete(topup)}
                                        >
                                          <Icon name="trash-delete-bin-3" className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {groupIndex < monthGroups.length - 1 && (
                          <div className="border-t border-dotted border-border my-6" style={{ marginTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}></div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
        
        <Dialog open={!!topupPendingDelete} onOpenChange={(open) => !open && !isDeleting && setTopupPendingDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base uppercase tracking-wide">Delete Topup</DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please confirm you want to delete the topup for{' '}
                {topupPendingDelete ? formatDate(topupPendingDelete.date) : ''}.
              </DialogDescription>
            </DialogHeader>
            {topupPendingDelete && (
              <div className="space-y-2 text-sm font-mono border border-dotted border-border p-4">
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{formatDate(topupPendingDelete.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Litres</span>
                  <span>{topupPendingDelete.litres.toFixed(2)} L</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost</span>
                  <span>£{topupPendingDelete.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <span>{topupPendingDelete.type}</span>
                </div>
              </div>
            )}
            {deleteError && (
              <p className="text-sm text-[var(--color-accent-red)]">{deleteError}</p>
            )}
            <DialogFooter className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => !isDeleting && setTopupPendingDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedTopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full max-h-[80vh] overflow-y-auto">
              <CardHeader className="relative">
                <CardTitle className="text-base pr-10">
                  Topup Details
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTopup(null)}
                  className="absolute top-4 right-4 h-8 w-8"
                  title="Close"
                >
                  <Icon name="x-close-delete" className="h-4 w-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs  text-muted-foreground">Date</label>
                    <p className="text-xs">{formatDate(selectedTopup.date)}</p>
                  </div>
                  <div>
                    <label className="text-xs  text-muted-foreground">Time</label>
                    <p className="text-xs">{formatTime(selectedTopup.date)}</p>
                  </div>
                  <div>
                    <label className="text-xs  text-muted-foreground">Litres</label>
                    <p className="text-xs ">{selectedTopup.litres.toFixed(2)} L</p>
                  </div>
                  <div>
                    <label className="text-xs  text-muted-foreground">Cost/Litre</label>
                    <p className="text-xs">£{selectedTopup.costPerLitre.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-xs  text-muted-foreground">Total Cost</label>
                    <p className="text-xs">£{selectedTopup.totalCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-xs  text-muted-foreground">Fuel Type</label>
                    <p className="text-xs">{selectedTopup.fuelType || '-'}</p>
                  </div>
                  {selectedTopup.retailer && (
                    <div>
                      <label className="text-xs  text-muted-foreground">Retailer</label>
                      <p className="text-xs">{selectedTopup.retailer}</p>
                    </div>
                  )}
                  {selectedTopup.locationName && (
                    <div>
                      <label className="text-xs  text-muted-foreground">Location</label>
                      <p className="text-xs font-medium">{selectedTopup.locationName}</p>
                      {selectedTopup.address && (
                        <p className="text-xs text-muted-foreground">{selectedTopup.address}</p>
                      )}
                    </div>
                  )}
                  {selectedTopup.fuelGrade && (
                    <div>
                      <label className="text-xs  text-muted-foreground">Fuel Grade</label>
                      <p className="text-xs">{selectedTopup.fuelGrade.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>
                    </div>
                  )}
                  {selectedTopup.netPrice && (
                    <div>
                      <label className="text-xs  text-muted-foreground">Net Price</label>
                      <p className="text-xs">£{selectedTopup.netPrice.toFixed(2)}</p>
                    </div>
                  )}
                  {selectedTopup.vatAmount && (
                    <div>
                      <label className="text-xs  text-muted-foreground">VAT Amount</label>
                      <p className="text-xs">£{selectedTopup.vatAmount.toFixed(2)}{selectedTopup.vatRate ? ` (${selectedTopup.vatRate}%)` : ''}</p>
                    </div>
                  )}
                  {selectedTopup.mileage && (
                    <div>
                      <label className="text-xs  text-muted-foreground">Mileage</label>
                      <p className="text-xs">{selectedTopup.mileage.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs  text-muted-foreground">Type</label>
                    <p className="text-xs">{selectedTopup.type}</p>
                  </div>
                </div>
                
                {selectedTopup.notes && (
                  <div>
                    <label className="text-xs  text-muted-foreground">Notes</label>
                    <p className="text-xs">{selectedTopup.notes}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Created:</span>
                    <span className="text-xs">
                      {formatDate(selectedTopup.createdAt)} at {formatTime(selectedTopup.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Updated:</span>
                    <span className="text-xs">
                      {formatDate(selectedTopup.updatedAt)} at {formatTime(selectedTopup.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


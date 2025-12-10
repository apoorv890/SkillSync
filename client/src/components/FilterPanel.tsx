import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';

const FilterPanel = ({ filters, onFilterChange, filterConfigs, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (filterId, value) => {
    const newFilters = { ...localFilters, [filterId]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {};
    filterConfigs.forEach(config => {
      clearedFilters[config.id] = config.type === 'select' ? 'all' : '';
    });
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const handleApplyFilters = () => {
    if (onClose) onClose();
  };

  return (
    <Card className="max-w-md mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle>Filters</CardTitle>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>

        <div className="space-y-4">
          {filterConfigs.map((config) => (
            <div key={config.id} className="space-y-2">
              {config.type === 'select' && (
                <>
                  <Label htmlFor={config.id}>{config.label}</Label>
                  <Select
                    value={localFilters[config.id] || ''}
                    onValueChange={(value) => handleFilterChange(config.id, value)}
                  >
                    <SelectTrigger id={config.id}>
                      <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {config.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {config.type === 'text' && (
                <>
                  <Label htmlFor={config.id}>{config.label}</Label>
                  <Input
                    id={config.id}
                    value={localFilters[config.id] || ''}
                    onChange={(e) => handleFilterChange(config.id, e.target.value)}
                    placeholder={config.placeholder || ''}
                  />
                </>
              )}

              {config.type === 'checkbox' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={config.id}
                    checked={localFilters[config.id] || false}
                    onCheckedChange={(checked) => handleFilterChange(config.id, checked)}
                  />
                  <Label htmlFor={config.id} className="cursor-pointer">
                    {config.description || config.label}
                  </Label>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex-1"
          >
            Clear All
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="flex-1"
          >
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterPanel;

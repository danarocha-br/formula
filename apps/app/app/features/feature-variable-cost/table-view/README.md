# Equipment Cost Table View

This directory contains the table view implementation for equipment cost expenses, providing a structured, spreadsheet-like interface for viewing equipment data.

## Implementation Status

✅ **Task 3 Complete**: Implement table column definitions with basic display

### Features Implemented

1. **Column Definitions**:

   - Select column with checkboxes for bulk operations
   - Category column with equipment category icons and colors
   - Name column for equipment names
   - Amount per month column with currency formatting
   - Amount per year column with currency formatting
   - Actions column with delete button

2. **Basic Display Functionality**:

   - Read-only display of equipment data
   - Proper currency formatting for amounts
   - Category icons and colors integration
   - Responsive column sizing

3. **Column Sizing and Styling**:

   - Matches fixed cost table design patterns
   - Proper column widths and minimum sizes
   - Right-aligned currency columns
   - Icon and color integration for categories

4. **Data Transformation**:
   - Converts EquipmentExpenseItem to table format
   - Calculates monthly/yearly costs from equipment depreciation
   - Handles edge cases (zero lifespan, missing data)

## Files Structure

```
table-view/
├── index.tsx                    # Main TableView component
├── data-table.tsx              # Reusable DataTable component
├── types.ts                    # TypeScript type definitions
├── data-transformations.ts     # Data transformation utilities
├── category-utils.ts           # Category-related utilities
├── example-usage.tsx           # Usage examples
├── __tests__/                  # Test files
│   ├── table-view.test.tsx
│   ├── column-definitions.test.tsx
│   ├── category-utils.test.ts
│   └── data-transformations.test.ts
└── README.md                   # This file
```

## Column Configuration

| Column   | Size  | Min Size | Max Size | Features                |
| -------- | ----- | -------- | -------- | ----------------------- |
| Select   | 30px  | 30px     | -        | Checkbox, no resize     |
| Category | 200px | 150px    | -        | Icon + label display    |
| Name     | 250px | 150px    | -        | Equipment name          |
| Monthly  | 150px | 120px    | -        | Currency, right-aligned |
| Yearly   | 150px | 120px    | -        | Currency, right-aligned |
| Actions  | 60px  | 50px     | 80px     | Delete button           |

## Integration

The table view is integrated with the main VariableCostView component and can be toggled using the view preference system:

```tsx
{
  viewPreference === "table" && equipmentExpenses && (
    <TableView
      data={equipmentExpenses}
      userId={userId}
      getCategoryColor={getCategoryColor}
      getCategoryLabel={getCategoryLabel}
    />
  );
}
```

## Next Steps

Future tasks will add:

- Inline editing functionality
- Add new row capability
- Delete operations
- Bulk operations
- Loading states and error handling

## Testing

All components are thoroughly tested with:

- Unit tests for utilities and transformations
- Component rendering tests
- Column configuration tests
- Integration tests

Run tests with:

```bash
npm test -- --run app/features/feature-variable-cost/table-view
```

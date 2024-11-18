import React from "react";

interface MasonryGridProps {
  children: React.ReactNode;
  maxColumns?: number;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({
  children,
  maxColumns = 4,
}) => {
  const childrenArray = React.Children.toArray(children);
  const columns: React.ReactNode[][] = Array.from({ length: maxColumns }, () => []);

  childrenArray.forEach((child, index) => {
    const columnIndex = index % maxColumns;
    columns[columnIndex]?.push(child);
  });

  return (
    <div className="@container">
      <div className="grid auto-rows-[1fr] gap-2 @[380px]:grid-cols-1 @[500px]:grid-cols-2 @[700px]:grid-cols-3 @[980px]:grid-cols-4">
        {columns.map((column, index) => (
          <div key={index} className="flex flex-col gap-2">
            {column}
          </div>
        ))}
      </div>
    </div>
  );
};

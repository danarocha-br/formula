import React from "react";

export const MasonryGrid: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const childrenArray = React.Children.toArray(children);
  const columns: React.ReactNode[][] = [[], [], []];

  childrenArray.forEach((child, index) => {
    const columnIndex = index % 3;
    columns[columnIndex]?.push(child);
  });

  return (
    <div className="@container">
      <div className="grid gap-2 @[380px]:grid-cols-1 @[500px]:grid-cols-2 @[700px]:grid-cols-3 @[980px]:grid-cols-4">
        {columns.map((column, index) => (
          <div key={index} className="flex flex-col gap-2">
            {column}
          </div>
        ))}
      </div>
    </div>
  );
};

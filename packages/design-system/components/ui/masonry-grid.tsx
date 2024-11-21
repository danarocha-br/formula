import React from "react";

interface MasonryGridProps {
  children: React.ReactNode;
}

export const MasonryGrid: React.FC<MasonryGridProps> = ({ children }) => {
  return (
    <div className="@container">
      <div className="grid gap-2 @[500px]:grid-cols-2 @[700px]:grid-cols-3 @[980px]:grid-cols-4">
        {React.Children.map(children, (child, index) => (
          <React.Fragment key={index}>{child}</React.Fragment>
        ))}
      </div>
    </div>
  );
};

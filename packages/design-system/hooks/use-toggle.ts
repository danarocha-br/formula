import { useReducer } from "react";

export const useToggle = (initialValue: boolean) => {
  const [state, setState] = useReducer(
    (prevState: boolean) => !prevState,
    initialValue
  );

  return [state, setState] as const;
};

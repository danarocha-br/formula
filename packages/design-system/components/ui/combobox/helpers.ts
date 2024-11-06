import { SelectOption } from ".";

const optionExistsInSet = new Set();

/**
 * Creates an option with the given name and adds it to the user options and selected values.
 * @param option - The option to be created.
 * @returns void
 */
export const handleCreateOption = (
  option: string,
  setUserOptions: React.Dispatch<React.SetStateAction<SelectOption[]>>,
  setSelectedValues: React.Dispatch<React.SetStateAction<SelectOption[]>>,
  setInputValue: React.Dispatch<React.SetStateAction<string>>
): void => {
  const newOption: SelectOption = {
    value: option.toLowerCase(),
    label: option,
  };

  if (!optionExistsInSet.has(newOption.value)) {
    optionExistsInSet.add(newOption.value);

    setUserOptions((prevOptions) => [...prevOptions, newOption]);
    setSelectedValues((prevValues) => [...prevValues, newOption]);
  }

  setInputValue("");
};

/**
 * Clears all selected values.
 *
 * @param setUserOptions - Function to update user options.
 * @param setSelectedValues - Function to update selected values.
 */
export const handleDeleteAllOptions = (
  setSelectedValues: (values: SelectOption[]) => void
): void => {
  setSelectedValues([]);
  optionExistsInSet.clear();
};

/**
 * Deletes a single option from the user options.
 *
 * @param option - The option to delete.
 */
export const handleDeleteSingleOption = (
  option: SelectOption,
  setSelectedValues: (value: React.SetStateAction<SelectOption[]>) => void
): void => {
  optionExistsInSet.delete(option.value);

  setSelectedValues((prevSelectedValues: SelectOption[]) =>
    prevSelectedValues.filter(
      (filteredOption: SelectOption) => filteredOption.value !== option.value
    )
  );
};

/**
 * Toggles the given option in the list of selected values.
 * If the option is not currently selected, it will be added to the list.
 * If the option is already selected, it will be removed from the list.
 *
 * @param option - The option to toggle.
 * @param setSelectedValues - The function to set the selected values.
 */
export const toggleMultiOptions = (
  option: SelectOption,
  selectedOptions: SelectOption[],
  setSelectedValues: React.Dispatch<React.SetStateAction<SelectOption[]>>
): void => {
  const isOptionSelected = selectedOptions.some(
    (selectedOption) => selectedOption.value === option.value
  );

  setSelectedValues(
    isOptionSelected
      ? selectedOptions.filter((o) => o.value !== option.value)
      : [...selectedOptions, option]
  );
};
/**
 * Toggles a single option in the selected options list.
 * If the option is already selected, it will be removed.
 * If the option is not selected, it will be added.
 *
 * @param option - The option to toggle
 * @param setSelectedValues - The function to update the selected options
 */
export const toggleSingleOption = (
  option: SelectOption,
  selectedOptions: SelectOption[],
  setSelectedValues: React.Dispatch<React.SetStateAction<SelectOption[]>>
): void => {
  const isOptionSelected = selectedOptions.some(
    (selectedOption) => selectedOption.value === option.value
  );

  setSelectedValues(
    isOptionSelected
      ? selectedOptions.filter((o) => o.value !== option.value)
      : [...selectedOptions, option]
  );
};

/**
 * Handles the change event when the combobox is opened or closed.
 * @param inputRef - The reference to the input element.
 * @param openCombobox - The new value indicating whether the combobox is open or not.
 * @param setOpenCombobox - The function to set the state of the combobox.
 */
export const onComboboxOpenChange = (
  inputRef: React.RefObject<HTMLInputElement>,
  openCombobox: boolean,
  setOpenCombobox: React.Dispatch<React.SetStateAction<boolean>>,
  disabled: boolean
): void => {
  if (inputRef.current) {
    inputRef.current.blur();
  }
  if (disabled) {
    setOpenCombobox(false);
  }
  setOpenCombobox(!openCombobox);
};

/**
 * Updates an option in the select options array and updates the selected values.
 *
 * @param {SelectOption} option - The option to update.
 * @param {SelectOption} newOption - The new option to replace the old option.
 * @param {React.Dispatch<React.SetStateAction<SelectOption[]>>} setUserOptions - The state setter for the select options array.
 * @param {(setter: (selectedOptions: SelectOption[]) => SelectOption[]) => void} setSelectedValues - The function to update the selected values.
 */
export const updateOption = (
  option: SelectOption,
  newOption: SelectOption,
  setUserOptions: React.Dispatch<React.SetStateAction<SelectOption[]>>,
  setSelectedValues: React.Dispatch<React.SetStateAction<SelectOption[]>>
): void => {
  // Update the options list
  setUserOptions((prevOptions) =>
    prevOptions.map((opt) => (opt.value === option.value ? newOption : opt))
  );

  // Update the selected values list
  setSelectedValues((prevSelectedValues) =>
    prevSelectedValues.map((val) =>
      val.value === option.value ? newOption : val
    )
  );
};

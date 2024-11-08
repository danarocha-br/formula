import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  handleDeleteAllOptions,
  handleDeleteSingleOption,
  onComboboxOpenChange,
  toggleMultiOptions,
  toggleSingleOption,
} from "./helpers";
import { useToggle } from "../../../hooks/use-toggle";
import { cn } from "../../../lib/utils";
import { Icon, iconPath } from "../icon";
import { Popover } from "../popover";
import { Command } from "../command";
import { Loader } from "../loader";
import { Chip } from "../chip";
import { IconButton } from "../icon-button";
import * as S from "./styles";

type SelectOption = {
  label: string;
  value: string;
  slot?: React.ReactNode;
};

export type ComboboxProps = {
  label?: string;
  name?: string;
  value?: { label?: string | undefined; value?: string | undefined };
  emptyMessage?: string;
  placeholder?: string;
  truncationLabel?: string;
  createOptionLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  isSearchable?: boolean;
  isClearable?: boolean;
  isMulti?: boolean;
  keepMinWidth?: boolean;
  minWidth?: string;
  options: SelectOption[];
  defaultOptions?: SelectOption[];
  icon?: keyof typeof iconPath;
  onChange?: (newValue: SelectOption | SelectOption[]) => void;
  actionIcon?: keyof typeof iconPath;
  errors?: any | undefined;
  className?: string;
};

export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      label,
      truncationLabel = "selected",
      placeholder,
      name,
      options,
      defaultOptions = [],
      searchPlaceholder = "Search...",
      emptyMessage = "No items found.",
      icon,
      minWidth,
      disabled = false,
      loading = false,
      readOnly = false,
      isSearchable = true,
      isClearable = false,
      isMulti = false,
      keepMinWidth = true,
      className,
      errors,
      value,
      onChange,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, toggleFocus] = useToggle(false);
    const [userOptions, setUserOptions] = useState<SelectOption[]>(options);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [inputValue, setInputValue] = useState<string>("");
    const [debouncedInputValue, setDebouncedInputValue] = useState(inputValue);
    const [selectedValues, setSelectedValues] = useState<SelectOption[]>(
      defaultOptions || []
    );

    useEffect(() => {
      if (value) {
        if (Array.isArray(value)) {
          setSelectedValues(value);
        } else {
          setSelectedValues([
            {
              label: value.label || "",
              value: value.value || "",
            },
          ]);
        }
      } else {
        setSelectedValues([]);
      }
    }, [value]);

    useEffect(() => {
      !loading && setUserOptions(options);
    }, [loading]);

    useEffect(() => {
      const timerId = setTimeout(() => {
        setDebouncedInputValue(inputValue);
      }, 300);

      return () => {
        clearTimeout(timerId);
      };
    }, [inputValue]);

    const areErrorsEmpty = useMemo(
      () => Boolean(errors) && Object.keys(errors).length === 0,
      [errors]
    );

    const selectedOptionHasSlot =
      selectedValues?.some((option) => option.slot) || false;

    /**
     * Helper functions.
     */
    const handleValueChange = (newValue: SelectOption | SelectOption[]) => {
      setSelectedValues(Array.isArray(newValue) ? newValue : [newValue]);

      if (onChange) {
        onChange(newValue);
      }

      if (!isMulti) {
        setOpenCombobox(false);
      }
    };

    const onDeleteSingleOption = (option: SelectOption) => {
      handleDeleteSingleOption(option, setSelectedValues);
    };

    const onDeleteAll = () => {
      handleDeleteAllOptions(setSelectedValues);
    };

    const onToggleMultiOptions = (option: SelectOption) => {
      handleValueChange(option);
      toggleMultiOptions(option, selectedValues, setSelectedValues);
    };

    const onToggleSingleOption = (option: SelectOption) => {
      handleValueChange(option);
      toggleSingleOption(option, selectedValues, setSelectedValues);
    };

    const onComboboxStateChange = () => {
      onComboboxOpenChange(inputRef, openCombobox, setOpenCombobox, disabled);
      // toggleFocus();
    };

    return (
      <div className="flex flex-col-reverse gap-0 w-full">
        {Boolean(errors) && !areErrorsEmpty ? (
          <div className="mt-1 inline-flex text-xs text-destructive">
            <Icon
              className="select-icon--error mr-1"
              label="error"
              name="alert"
              size="xs"
              color="danger"
            />
            {errors.message}
          </div>
        ) : null}

        <div
          className={S.container({
            isFocused: openCombobox,
            isDisabled: disabled,
            hasError: Boolean(errors) && !areErrorsEmpty ? true : false,
            isReadOnly: readOnly,
            className,
          })}
        >
          {!!label && (
            <div
              className={S.label({
                isFocused: openCombobox,
                isDisabled: disabled,
                isReadOnly: readOnly,
              })}
            >
              <div className="flex gap-2 items-center">
                {Boolean(icon) && (
                  <Icon
                    label="input icon"
                    name={icon || "work"}
                    size="xs"
                    className={S.icon()}
                  />
                )}

                {label}
              </div>

              {loading && (
                <span className="select-icon--loading absolute right-2">
                  <Loader />
                </span>
              )}
            </div>
          )}

          <Popover.Root
            open={!disabled && openCombobox}
            onOpenChange={onComboboxStateChange}
          >
            <Popover.Trigger asChild>
              <button
                ref={ref}
                type="button"
                role="combobox"
                name={name}
                aria-expanded={openCombobox}
                aria-labelledby={label}
                aria-readonly={readOnly}
                onFocus={() => toggleFocus()}
                onBlur={() => toggleFocus()}
                className={S.inputWrapper({
                  isFocused: openCombobox,
                  isDisabled: disabled,
                  isReadOnly: readOnly,
                })}
              >
                <span
                  className={S.chips({
                    hasSlot: selectedOptionHasSlot ? true : false,
                  })}
                >
                  {selectedValues.length === 0 && (
                    <span
                      className={S.placeholder({
                        isDisabled: disabled,
                      })}
                    >
                      {placeholder}
                    </span>
                  )}

                  <span className="flex gap-2 items-center">
                    {!isMulti &&
                      selectedValues.length === 1 &&
                      options &&
                      options
                        .filter(
                          (option) => option.value === selectedValues[0]?.value
                        )
                        .map((option) => (
                          <span
                            key={option.value}
                            className="text-sm flex gap-2 items-center text-text-color-body"
                          >
                            {!!option.slot && option.slot} {option.label}
                          </span>
                        ))}
                  </span>

                  {isMulti && selectedValues.length === 1 && (
                    <Chip
                      label={selectedValues[0]?.label || ""}
                      color="neutral"
                      removable
                      onRemove={() =>
                        selectedValues[0] &&
                        onDeleteSingleOption(selectedValues[0])
                      }
                      hasMaxWidth
                    >
                      {!!selectedValues[0]?.slot && selectedValues[0]?.slot}
                    </Chip>
                  )}

                  {isMulti &&
                    selectedValues.length === 2 &&
                    selectedValues.map((option) => (
                      <Chip
                        key={option.value}
                        label={option.label}
                        color="neutral"
                        removable
                        onRemove={() => onDeleteSingleOption(option)}
                        hasMaxWidth
                      >
                        {!!option.slot && option.slot}
                      </Chip>
                    ))}

                  {isMulti && selectedValues.length > 2 && (
                    <>
                      <b>{selectedValues.length}</b>
                      {truncationLabel}
                    </>
                  )}
                </span>

                {isClearable && isMulti && selectedValues.length >= 1 && (
                  <>
                    <IconButton
                      type="button"
                      icon="close"
                      label="remove selection"
                      size="xs"
                      className={S.deleteButton({ isFocused: openCombobox })}
                      onClick={onDeleteAll}
                    />
                    <span className="h-4 border-r border-action-color-border-transparent-enabled/50" />
                  </>
                )}

                {!readOnly && (
                  <Icon
                    name="down"
                    label="open menu"
                    size="xs"
                    className={`ml-auto shrink-0 ${S.placeholder({
                      isDisabled: disabled,
                    })}`}
                  />
                )}
              </button>
            </Popover.Trigger>
            <Popover.Content
              align="start"
              className={cn(
                "p-1 w-full min-w-[260px]",
                minWidth && minWidth,
                !keepMinWidth && " w-[95vw] md:w-[70vw] lg:w-[45vw]"
              )}
            >
              <Command.Root className="w-full" loop>
                {isSearchable && (
                  <Command.Input
                    ref={inputRef}
                    placeholder={searchPlaceholder}
                    value={inputValue}
                    onValueChange={setInputValue}
                  />
                )}

                <Command.Empty className={S.empty()}>
                  {emptyMessage}
                </Command.Empty>

                <Command.Group className="max-h-[240px] overflow-auto p-1">
                  {userOptions &&
                    userOptions.map((option) => {
                      const isActive = selectedValues.some(
                        (selectedValue) => selectedValue.value === option.value
                      );

                      return (
                        <Command.Item
                          key={option.value}
                          value={option.value}
                          onSelect={() =>
                            isMulti
                              ? onToggleMultiOptions(option)
                              : onToggleSingleOption(option)
                          }
                          className={S.item({
                            isActive,
                            isMulti,
                          })}
                        >
                          {Boolean(option.slot) && (
                            <div className="mr-2">{option.slot}</div>
                          )}

                          <div className="flex-1 truncate">{option.label}</div>
                        </Command.Item>
                      );
                    })}
                </Command.Group>
              </Command.Root>
            </Popover.Content>
          </Popover.Root>
        </div>
      </div>
    );
  }
);

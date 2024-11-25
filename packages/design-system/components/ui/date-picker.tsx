"use client";

import { cn } from "@repo/design-system/lib/utils";
import React, { forwardRef, useCallback, useState } from "react";
import { useTimescape, type Options } from "timescape/react";
import { cva } from "class-variance-authority";

import { Input } from "./input";

const timePickerInputBase = cva([
  "bg-transparent",
  "px-1",
  "font-sans",
  "inline",
  "tabular-nums",
  "border-none",
  "outline-none",
  "select-none",
  "content-box",
  "caret-transparent",
  "rounded-sm",
  "min-w-10",
  "text-center",
  "hover:bg-card",
  "focus:bg-primary",
  "focus-visible:ring-0",
  "focus-visible:outline-none",
]);
const timePickerSeparatorBase = "text-sm text-muted-foreground";

type DateFormat = "days" | "months" | "years";
type TimeFormat = "hours" | "minutes" | "seconds" | "am/pm";

type DateTimeArray<T extends DateFormat | TimeFormat> = T[];
type DateTimeFormatDefaults = [
  DateTimeArray<DateFormat>,
  DateTimeArray<TimeFormat>,
];

const DEFAULTS = [
  ["months", "days", "years"],
  ["hours", "minutes", "am/pm"],
] as DateTimeFormatDefaults;

type TimescapeReturn = ReturnType<typeof useTimescape>;
type InputPlaceholders = Record<DateFormat | TimeFormat, string>;
const INPUT_PLACEHOLDERS: InputPlaceholders = {
  months: "MM",
  days: "DD",
  years: "YYYY",
  hours: "HH",
  minutes: "MM",
  seconds: "SS",
  "am/pm": "AM/PM",
};

const DatetimeGrid = forwardRef<
  HTMLDivElement,
  {
    format: DateTimeFormatDefaults;
    className?: string;
    timescape: Pick<TimescapeReturn, "getRootProps" | "getInputProps">;
    placeholders: InputPlaceholders;
  }
>(
  (
    {
      format,
      className,
      timescape,
      placeholders,
      errors,
    }: {
      format: DateTimeFormatDefaults;
      className?: string;
      timescape: Pick<TimescapeReturn, "getRootProps" | "getInputProps">;
      placeholders: InputPlaceholders;
      errors?: any;
    },
    ref
  ) => {
    const areErrorsEmpty = React.useMemo(
      () => Boolean(errors) && Object.keys(errors).length === 0,
      [errors]
    );

    return (
      <div
        className={cn(
          "flex items-center px-1 border bg-ring/60 w-full border-transparent",
          Boolean(errors) && !areErrorsEmpty && "border-destructive",
          className,
          "rounded-sm gap-1 selection:bg-transparent selection:text-card-foreground"
        )}
        {...timescape.getRootProps()}
        ref={ref}
      >
        {!!format?.length
          ? format.map((group, i) => (
              <React.Fragment key={i === 0 ? "dates" : "times"}>
                {!!group?.length
                  ? group.map((unit, j) => (
                      <React.Fragment key={unit}>
                        <Input
                          className={cn(timePickerInputBase(), {
                            "min-w-16": unit === "years",
                            "bg-foreground/15": unit === "am/pm",
                          })}
                          {...timescape.getInputProps(unit)}
                          placeholder={placeholders[unit]}
                        />
                        {i === 0 && j < group.length - 1 ? (
                          // date separator
                          <span className={timePickerSeparatorBase}>/</span>
                        ) : (
                          j < group.length - 2 && (
                            // time separator
                            <span className={timePickerSeparatorBase}>:</span>
                          )
                        )}
                      </React.Fragment>
                    ))
                  : null}
                {format[1]?.length && !i ? (
                  // date-time separator - only if both date and time are present
                  <span
                    className={cn(
                      timePickerSeparatorBase,
                      "opacity-30 text-xl"
                    )}
                  >
                    |
                  </span>
                ) : null}
              </React.Fragment>
            ))
          : null}
      </div>
    );
  }
);

DatetimeGrid.displayName = "DatetimeGrid";

interface DateTimeInput {
  value?: Date;
  format: DateTimeFormatDefaults;
  placeholders?: InputPlaceholders;
  onChange?: Options["onChangeDate"];
  dtOptions?: Options;
  className?: string;
  errors?: any;
}

const DEFAULT_TS_OPTIONS = {
  date: new Date(),
  hour12: false,
};
export const DatePicker = forwardRef<HTMLDivElement, DateTimeInput>(
  (
    {
      value = new Date(),
      format = DEFAULTS,
      placeholders,
      dtOptions = DEFAULT_TS_OPTIONS,
      onChange,
      className,
      errors,
    },
    ref
  ) => {
    const handleDateChange = useCallback(
      (nextDate: Date | undefined) => {
        onChange ? onChange(nextDate) : console.log(nextDate);
      },
      [onChange]
    );
    const timescape = useTimescape({
      date: value,
      onChangeDate: handleDateChange,
      ...dtOptions,
    });
    return (
      <DatetimeGrid
        format={format}
        className={className}
        timescape={timescape}
        placeholders={placeholders ?? INPUT_PLACEHOLDERS}
        ref={ref}
      />
    );
  }
);

DatePicker.displayName = "DatePicker";

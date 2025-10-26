import React from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import ChevronUpIcon from "@jetbrains/icons/chevron-up";
import ChevronDownIcon from "@jetbrains/icons/chevron-down";

interface VerticalSizeControlProps {
  minValue: number;
  maxValue: number;
  value: number;
  increment: number;
  onChange: (value: number) => void;
}

const VerticalSizeControl: React.FunctionComponent<VerticalSizeControlProps> = ({
  minValue,
  maxValue,
  value,
  increment,
  onChange,
}) => {
  const onIncrease = () => {
    const newValue = Math.min(value + increment, maxValue);
    onChange(newValue);
  };
  const onDecrease = () => {
    const newValue = Math.max(value - increment, minValue);
    onChange(newValue);
  };

  return (
    <div className="vertical-size-control-bar">
      {value < maxValue && (
        <Button aria-label="Grow" icon={ChevronDownIcon} onClick={onIncrease}>
          Grow
        </Button>
      )}
      {value > minValue && (
        <Button aria-label="Shrink" icon={ChevronUpIcon} onClick={onDecrease}>
          Shrink
        </Button>
      )}
    </div>
  );
};

export default VerticalSizeControl;

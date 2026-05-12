import React from "react";

export default function OTPInputs({ inputsRef }) {
  const handleInput = (e, index) => {
    if (e.target.value.length === 1 && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="code-inputs">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          type="text"
          maxLength={1}
          ref={(el) => (inputsRef.current[i] = el)}
          onInput={(e) => handleInput(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
        />
      ))}
    </div>
  );
}

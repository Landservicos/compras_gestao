import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import "../styles/searchableSelect.css";

interface Option {
  id: number;
  nome?: string;
  username?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const getOptionName = (option: Option) => option.nome || option.username || "";

  useEffect(() => {
    const selectedOption = options.find((opt) => String(opt.id) === value);
    if (selectedOption) {
      setInputValue(getOptionName(selectedOption));
    } else {
      setInputValue("");
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelectOption = (option: Option) => {
    onChange(String(option.id));
    setInputValue(getOptionName(option));
    setIsOpen(false);
  };

  const clearSelection = () => {
    onChange("");
    setInputValue("");
  };

  const filteredOptions = options.filter((option) =>
    getOptionName(option).toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef}>
      <div className="searchable-select-input-container">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="searchable-select-input"
        />
        {value ? (
          <X
            size={16}
            className="searchable-select-icon clear-icon"
            onClick={clearSelection}
          />
        ) : (
          <ChevronDown
            size={16}
            className={`searchable-select-icon ${isOpen ? "open" : ""}`}
          />
        )}
      </div>
      {isOpen && (
        <ul className="searchable-select-dropdown">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option.id}
                onClick={() => handleSelectOption(option)}
                className={String(option.id) === value ? "selected" : ""}
              >
                {getOptionName(option)}
              </li>
            ))
          ) : (
            <li className="no-options">Nenhuma opção encontrada</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;

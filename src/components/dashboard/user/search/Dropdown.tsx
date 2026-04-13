import React from "react";

import styles from "@/components/dashboard/user/search/Dropdown.module.css";

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  title: string;
  options: DropdownOption[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  id: string;
  name: string;
};

export default function Dropdown({ title, options, value, onChange, id, name }: DropdownProps) {
  return (
    <div className={styles.select}>
      <select value={value} onChange={onChange} name={name} id={id} className={styles.selectTag}>
        <option value="" disabled>
          {title}
        </option>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

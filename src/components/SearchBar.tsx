export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search-bar">
      <ion-icon name="search-outline" style={{ color: 'var(--text-muted)', fontSize: 18 }} />
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

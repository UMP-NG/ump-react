export default function StarRow({ value, max = 5 }) {
  return (
    <span className="adm-stars">
      {Array.from({ length: max }).map((_, i) => (
        <i
          key={i}
          className="fa-solid fa-star"
          style={i >= Math.round(value) ? { color: '#e3e5eb' } : undefined}
        />
      ))}
    </span>
  );
}

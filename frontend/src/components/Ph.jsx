const PH_ICONS = {
  electronics: "laptop", books: "book", clothing: "shirt", food: "utensils",
  accessories: "gem", beauty: "spa", fitness: "dumbbell", tutoring: "graduation-cap",
  design: "palette", music: "music", photo: "camera", coding: "code",
  "hostel-1": "bed", "hostel-2": "bed", "hostel-3": "bed",
  campus: "university", service: "hand-holding-heart", default: "image",
  "portrait-1": "user", "portrait-2": "user", "portrait-3": "user",
  "portrait-4": "user", "portrait-5": "user", "portrait-6": "user",
};

export default function Ph({ kind = "default", label = "", style = {} }) {
  const icon = PH_ICONS[kind] || "image";
  return (
    <div className={`img-ph ph-${kind}`} style={{ width: "100%", height: "100%", ...style }}>
      <i className={`fas fa-${icon}`} style={{ fontSize: "3rem", position: "relative", zIndex: 1 }} />
      {label && (
        <span style={{ marginTop: 6, fontSize: "1rem", position: "relative", zIndex: 1 }}>{label}</span>
      )}
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: string;
  colorClass: string;
  title: string;
}

export default function ActionButton({
  onClick,
  icon,
  colorClass,
  title,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${colorClass}`}
      title={title}
    >
      <img src={icon} className="w-4 h-4" alt="" />
    </button>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: string;
  variant?: "edit" | "delete" | "star" | "hide" | "danger";
  title: string;
}

const variantClasses = {
  edit: "text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20",
  delete:
    "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
  star: "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20",
  hide: "text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20",
  danger:
    "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
};

export default function ActionButton({
  onClick,
  icon,
  variant = "edit",
  title,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${variantClasses[variant]}`}
      title={title}
    >
      <img src={icon} className="w-4 h-4" alt="" />
    </button>
  );
}

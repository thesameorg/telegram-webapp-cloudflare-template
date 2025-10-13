import PlusIcon from "./icons/plus.svg";

interface CreatePostButtonProps {
  onClick: () => void;
}

export default function CreatePostButton({ onClick }: CreatePostButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
    >
      <img src={PlusIcon} className="w-4 h-4 mr-2" alt="" />
      Post
    </button>
  );
}

interface StatusDisplayProps {
  healthStatus: string;
  kvStatus: string;
  sessionId: string | null | undefined;
  timeLeft: string;
  healthTimestamp: string;
}

export default function StatusDisplay({
  healthStatus,
  kvStatus,
  sessionId,
  timeLeft,
  healthTimestamp,
}: StatusDisplayProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <p className="text-lg font-semibold text-green-600">
        Welcome to Telegram Web App!
      </p>

      <div className="text-sm text-gray-600">
        <p>
          <strong>Backend Status:</strong> <span>{healthStatus}</span>
        </p>
        <p>
          <strong>KV Status:</strong> <span>{kvStatus}</span>
        </p>
        <p>
          <strong>Session ID:</strong>{" "}
          <span>{sessionId ? sessionId.slice(0, 8) + "..." : "None"}</span>
        </p>
        <p>
          <strong>Time Left:</strong> <span>{timeLeft}</span>
        </p>
        <p>
          <strong>Last Check:</strong> <span>{healthTimestamp}</span>
        </p>
      </div>
    </div>
  );
}

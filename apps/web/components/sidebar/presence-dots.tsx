'use client';

interface PresenceDotsProps {
  users: Array<{ color: string }>;
}

export function PresenceDots({ users }: PresenceDotsProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5">
      {users.slice(0, 3).map((user, i) => (
        <span
          key={i}
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: user.color }}
        />
      ))}
      {users.length > 3 && (
        <span className="text-[10px] text-muted-foreground">+{users.length - 3}</span>
      )}
    </div>
  );
}

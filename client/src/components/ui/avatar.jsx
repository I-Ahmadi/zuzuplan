import { cn } from "@/utils/cn";

export function getInitials(user, fallback = "U") {
  const label = user?.name || user?.email || fallback;
  const parts = String(label).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(label).slice(0, 2).toUpperCase();
}

export function Avatar({ className, ...props }) {
  return <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props} />;
}

export function AvatarImage({ className, ...props }) {
  return <img className={cn("aspect-square h-full w-full", className)} {...props} />;
}

export function AvatarFallback({ className, ...props }) {
  return <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props} />;
}

export function UserAvatar({ user, fallback = "U", className, imageClassName, fallbackClassName }) {
  const initials = getInitials(user, fallback);

  return (
    <Avatar className={className} title={user?.name || user?.email || undefined}>
      <AvatarFallback className={cn("bg-primary/10 text-xs font-semibold text-primary", fallbackClassName)}>
        {initials}
      </AvatarFallback>
      {user?.avatar ? (
        <AvatarImage
          src={user.avatar}
          alt=""
          className={cn("absolute inset-0 object-cover", imageClassName)}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </Avatar>
  );
}

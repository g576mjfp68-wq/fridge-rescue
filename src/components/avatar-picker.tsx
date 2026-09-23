"use client";

import { AVATARS, avatarSrc, type AvatarId } from "@/lib/avatars";

/** Radio group: arrow keys move between avatars, Space/Enter selects. */
export function AvatarPicker({ value, onChange, legend, disabled }: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  legend: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <fieldset className="avatar-picker" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="avatar-grid">
        {AVATARS.map((avatar) => (
          <label key={avatar.id} className={value === avatar.id ? "is-selected" : ""}>
            <input
              type="radio"
              name="avatar"
              value={avatar.id}
              checked={value === avatar.id}
              onChange={() => onChange(avatar.id)}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny local SVG */}
            <img src={avatarSrc(avatar.id)} alt="" width={52} height={52} />
            <span>{avatar.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

import React from 'react';
import './CollaboratorAvatars.css';

export const CollaboratorAvatars = ({ collaborators = [] }) => {
  const displayCount = 4;
  const shown = collaborators.slice(0, displayCount);
  const hidden = collaborators.length - displayCount;

  return (
    <div className="collaborator-avatars">
      <div className="avatar-stack">
        {shown.map((collab) => (
          <div
            key={collab.id}
            className="avatar"
            style={{ borderColor: collab.color }}
            title={collab.name}
          >
            <img src={collab.avatar} alt={collab.name} />
          </div>
        ))}
        {hidden > 0 && (
          <div className="avatar-count">+{hidden}</div>
        )}
      </div>
    </div>
  );
};

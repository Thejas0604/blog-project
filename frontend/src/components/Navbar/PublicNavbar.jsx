import React from "react";
import { Link } from "react-router-dom";

function PublicNavbar() {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/create-post">Create Post</Link>
          </li>
          <li>
            <Link to="/list">List Post</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default PublicNavbar;

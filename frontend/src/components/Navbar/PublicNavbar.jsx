import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import Nav from "./Nav";

function PublicNavbar() {
  return (
    <div>
      <header style={{ margin: "20px" }}>
        <Nav />
      </header>
    </div>
  );
}

export default PublicNavbar;

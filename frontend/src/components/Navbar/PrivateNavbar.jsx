import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import PrivateNav from "./PrivateNav";

function PrivateNavbar() {
  return (
    <div>
      <header style={{ margin: "20px" }}>
        <PrivateNav />
      </header>
    </div>
  );
}

export default PrivateNavbar;
